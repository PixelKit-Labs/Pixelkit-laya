import { useRef, useState } from 'react';
import { File, Directory, Paths } from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import * as ort from 'onnxruntime-react-native';
import { Keyboard, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { loadMobileFusedAgent } from '@pixelkit-labs/laya/mobile';
import { CHECKPOINT, SUITE_VERSION, useCases } from './cases';
import { type CaseResult, evaluateCase, evaluateSuite, summarize } from './evaluation';

type Provider = 'cpu' | 'xnnpack' | 'nnapi';
const modelDir = new Directory(Paths.document, 'laya');
const model = new File(modelDir, 'model.onnx');
const weights = new File(modelDir, 'model.onnx.data');
const config = new File(modelDir, 'rl_agent_config.json');
const tokenizer = new File(modelDir, 'tokenizer.json');
const totalCases = useCases.reduce((sum, item) => sum + item.examples.length, 0);

export default function App() {
  const [provider, setProvider] = useState<Provider>('cpu');
  const [selected, setSelected] = useState(0);
  const [input, setInput] = useState(useCases[0].examples[0].input);
  const [status, setStatus] = useState('Ready');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [rows, setRows] = useState<CaseResult[]>([]);
  const [single, setSingle] = useState<CaseResult | null>(null);
  const [report, setReport] = useState('');
  const [reportPath, setReportPath] = useState('');
  const [loadMs, setLoadMs] = useState<number | null>(null);
  const [details, setDetails] = useState(false);
  const useCase = useCases[selected];
  const summary = summarize(rows);

  function selectCase(index: number) {
    setSelected(index);
    setInput(useCases[index].examples[0].input);
    setSingle(null);
  }

  async function run(suite: boolean) {
    if (lock.current || (!suite && !input.trim())) return;
    lock.current = true;
    Keyboard.dismiss();
    setBusy(true);
    setSingle(null);
    setRows([]);
    setReport('');
    setReportPath('');
    setLoadMs(null);
    let agent: Awaited<ReturnType<typeof loadMobileFusedAgent>> | null = null;
    try {
      if (!model.exists || !weights.exists || !config.exists || !tokenizer.exists) {
        throw new Error('Missing local model files. Open Model setup below.');
      }
      setStatus('Loading model');
      const loadStart = performance.now();
      agent = await loadMobileFusedAgent(ort, {
        modelPath: model.uri.replace(/^file:\/\//, ''),
        config: JSON.parse(await config.text()), tokenizerJson: JSON.parse(await tokenizer.text()),
        revision: CHECKPOINT.revision,
      }, { executionProvider: provider });
      const loadedMs = Math.round(performance.now() - loadStart);
      setLoadMs(loadedMs);
      const predict = agent.predict.bind(agent);
      if (suite) {
        let completed = 0;
        const results = await evaluateSuite(predict, useCases, (row) => {
          completed += 1;
          setRows((current) => [...current, row]);
          setStatus(`Evaluating ${completed}/${totalCases}`);
        });
        const output = JSON.stringify({
          suiteVersion: SUITE_VERSION, sdkVersion: '0.1.8', createdAt: new Date().toISOString(),
          checkpoint: CHECKPOINT, artifactIdentity: 'Expected checkpoint; verify local file hashes separately',
          requestedProvider: provider, actualExecutionPlacement: 'Not measured; provider may fall back to CPU',
          loadMs: loadedMs, firstDecisionMs: results[0]?.elapsedMs,
          modelBytes: model.size + weights.size, processMemoryBytes: null,
          summary: summarize(results), basic: summarize(results.filter((row) => row.kind === 'basic')),
          challenge: summarize(results.filter((row) => row.kind === 'challenge')),
          byUseCase: Object.fromEntries(useCases.map((item) => [item.id, summarize(results.filter((row) => row.useCase === item.id))])),
          limitations: '24 authored examples, not a held-out accuracy benchmark. Probabilities are not measured accuracy. Latencies include JS tokenization and inference; first decision is included. No actions are executed.',
          definitions: useCases, results,
        }, null, 2);
        setReport(output);
        const file = new File(Paths.document, 'laya-evaluation.json');
        try {
          file.write(output);
          setReportPath(file.uri);
          setStatus('Evaluation complete');
        } catch (error) {
          setStatus(`Evaluation complete; could not save report: ${String(error)}`);
        }
      } else {
        setStatus('Making a decision');
        // Custom inputs have no truth label; their UI never displays pass/fail.
        const result = await evaluateCase(predict, useCase, {
          id: 'custom', input, expected: '', kind: 'basic', why: '',
        });
        setSingle(result);
        setStatus(result.outcome === 'error' ? 'Decision failed' : 'Decision complete');
      }
    } catch (error) {
      setStatus(`Failed: ${String(error)}`);
    } finally {
      try { await agent?.dispose(); }
      catch (error) { setStatus((current) => `${current}; cleanup failed: ${String(error)}`); }
      finally { lock.current = false; setBusy(false); }
    }
  }

  function button(label: string, action: () => void, disabled = busy, active = false) {
    return <Pressable key={label} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }} disabled={disabled} onPress={action}
      style={[styles.button, active && styles.active, disabled && styles.disabled]}>
      <Text style={active ? styles.white : styles.buttonText}>{label}</Text>
    </Pressable>;
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>LOCAL DECISIONS / PIXELKIT</Text>
      <Text style={styles.title}>What can Laya decide?</Text>
      <Text style={styles.body}>Choose a use case, edit a message, or check {totalCases} examples with answers defined in advance. Everything runs on this phone.</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Check the examples</Text>
        <Text style={styles.body}>18 basic cases + 6 challenges: negation, unclear requests, multiple intents, and misleading instructions.</Text>
        {button(`Run ${totalCases} examples`, () => void run(true), busy, true)}
        <Text accessibilityLiveRegion="polite" testID="evaluation-status" style={styles.label}>{status}</Text>
        {loadMs !== null && <Text>Model load: {loadMs} ms</Text>}
        {rows.length > 0 && <>
          <Text testID="evaluation-summary" style={styles.heading}>{summary.correct}/{summary.total} correct{busy ? ' so far' : ''}</Text>
          <Text>{summary.incorrect} wrong · {summary.errors} errors · {totalCases - rows.length} remaining</Text>
          <Text>Decision latency: median {summary.medianMs ?? '—'} ms · p95 {summary.p95Ms ?? '—'} ms</Text>
          {useCases.map((item) => {
            const group = summarize(rows.filter((row) => row.useCase === item.id));
            return <Text key={item.id}>{item.title}: {group.correct}/{group.total} correct</Text>;
          })}
          <Text style={styles.note}>This measures only these authored examples, not general accuracy. Errors count as failures. Timing includes the first decision.</Text>
        </>}
        {!!report && button('Share evaluation report', () => {
          void Share.share({ message: report }).catch((error) => setStatus(`Share failed: ${String(error)}`));
        })}
      </View>
      <Text style={styles.heading}>Try your own message</Text>
      <View style={styles.row}>{useCases.map((item, index) => button(item.title, () => selectCase(index), busy, selected === index))}</View>
      <Text style={styles.body}>{useCase.purpose}</Text>
      <Text style={styles.note}>Possible answers: {Object.keys(useCase.criteria).join(', ')}. “Review” is a model choice, not a guaranteed safety mechanism.</Text>
      <TextInput accessibilityLabel="Message to classify" testID="decision-input" multiline editable={!busy}
        value={input} onChangeText={(value) => { setInput(value); setSingle(null); }} maxLength={1200}
        style={styles.input} placeholder="Enter a message" />
      {button('Classify message', () => void run(false), busy || !input.trim(), true)}
      {single && <View style={styles.card}>
        <Text style={styles.heading}>{single.actual ? `Suggested decision: ${single.actual}` : 'No decision'}</Text>
        {single.error ? <Text>{single.error}</Text> : <>
          <Text>Model probability: {((single.probability ?? 0) * 100).toFixed(1)}% · {single.elapsedMs} ms</Text>
          <Text style={styles.note}>Probability is the model’s score for this answer, not proof that it is correct. No action was executed.</Text>
          {Object.entries(single.probabilities ?? {}).map(([key, value]) => <Text key={key}>{key}: {(value * 100).toFixed(1)}%</Text>)}
        </>}
      </View>}
      <Text style={styles.heading}>Examples and expected answers</Text>
      {useCase.examples.map((example) => <View key={example.id} style={styles.card}>
        <Text style={styles.eyebrow}>{example.kind.toUpperCase()} · EXPECTED: {example.expected}</Text>
        <Text style={styles.body}>{example.input}</Text>
        <Text style={styles.note}>{example.why}</Text>
        {button(`Try ${example.id}`, () => { setInput(example.input); setSingle(null); })}
      </View>)}
      {rows.length > 0 && <>
        <Text style={styles.heading}>Every evaluation result</Text>
        {rows.map((row) => <View key={`${row.useCase}/${row.id}`} style={styles.card}>
          <Text style={row.outcome === 'correct' ? styles.correct : styles.wrong}>{row.outcome.toUpperCase()} · {row.useCase} / {row.id}</Text>
          <Text>{row.input}</Text>
          <Text>Expected: {row.expected} · Actual: {row.actual ?? 'error'} · {row.elapsedMs} ms</Text>
          <Text style={styles.note}>{row.why}</Text>
          {row.error && <Text style={styles.wrong}>{row.error}</Text>}
        </View>)}
      </>}
      {button(details ? 'Hide model setup' : 'Model setup', () => setDetails(!details), false)}
      {details && <View style={styles.card}>
        <Text selectable style={styles.note}>{modelDir.uri}</Text>
        {[model, weights, config, tokenizer].map((file) => <Text key={file.name}>{file.name}: {file.exists ? 'present' : 'missing'}</Text>)}
        <Text style={styles.label}>Requested execution provider</Text>
        <View style={styles.row}>{(['cpu', 'xnnpack', 'nnapi'] as const).map((name) => button(name, () => setProvider(name), busy, provider === name))}</View>
        <Text style={styles.note}>CPU is the baseline. Selecting NNAPI does not prove accelerator use; execution can fall back to CPU.</Text>
        {!!reportPath && <Text selectable style={styles.note}>Saved report: {reportPath}</Text>}
      </View>}
      <StatusBar style="dark" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22, paddingTop: 64, paddingBottom: 48, gap: 14, backgroundColor: '#f3f6fa' },
  title: { fontSize: 30, fontWeight: '700', color: '#152b44' },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#496580' },
  heading: { fontSize: 19, fontWeight: '700', color: '#152b44' },
  body: { fontSize: 15, lineHeight: 22, color: '#253e54' },
  label: { fontWeight: '700', color: '#152b44' },
  note: { fontSize: 13, lineHeight: 19, color: '#536579' },
  card: { padding: 17, borderRadius: 16, backgroundColor: '#fff', gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#e2eaf2' },
  active: { backgroundColor: '#154d80' },
  disabled: { opacity: 0.5 },
  white: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  buttonText: { color: '#154d80', fontWeight: '600', textAlign: 'center' },
  input: { padding: 16, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#b4c7d8', minHeight: 110, textAlignVertical: 'top', fontSize: 16, color: '#152b44' },
  correct: { color: '#186343', fontWeight: '700' },
  wrong: { color: '#a12929', fontWeight: '700' },
});
