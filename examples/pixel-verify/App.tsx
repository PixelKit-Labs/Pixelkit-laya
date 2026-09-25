import { useState } from 'react';
import { File, Directory, Paths } from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import * as ort from 'onnxruntime-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { loadMobileFusedAgent } from '@pixelkit-labs/laya/mobile';

type Provider = 'cpu' | 'xnnpack' | 'nnapi';
const modelDir = new Directory(Paths.document, 'laya');
const model = new File(modelDir, 'model.onnx');
const weights = new File(modelDir, 'model.onnx.data');
const config = new File(modelDir, 'rl_agent_config.json');
const tokenizer = new File(modelDir, 'tokenizer.json');

const questions = {
  team: {
    type: 'choice',
    instructions: 'Which team should handle this?',
    criteria: {
      billing: 'invoices, payments, refunds',
      technical: 'bugs, outages',
      sales: 'pricing',
    },
  },
};
const state = 'I was billed twice. Please refund the duplicate.';

export default function App() {
  const [provider, setProvider] = useState<Provider>('cpu');
  const [status, setStatus] = useState('Ready');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setResult('');
    let agent: Awaited<ReturnType<typeof loadMobileFusedAgent>> | null = null;
    try {
      if (!model.exists || !weights.exists || !config.exists || !tokenizer.exists) {
        throw new Error('Stage all four model files in the directory shown below.');
      }
      setStatus('Loading native ONNX session');
      const loadStart = performance.now();
      agent = await loadMobileFusedAgent(ort, {
        modelPath: model.uri.replace(/^file:\/\//, ''),
        config: JSON.parse(await config.text()),
        tokenizerJson: JSON.parse(await tokenizer.text()),
      }, { executionProvider: provider });
      const loadMs = Math.round(performance.now() - loadStart);
      setStatus('Running six decisions');
      const timings: number[] = [];
      let answer = '';
      for (let i = 0; i < 6; i++) {
        const start = performance.now();
        const prediction = await agent.predict(state, questions);
        timings.push(Math.round(performance.now() - start));
        answer = JSON.stringify(prediction.answers.team);
      }
      setResult(JSON.stringify({
        provider, loadMs, firstMs: timings[0], warmMs: timings.slice(1), answer,
        modelBytes: model.size + weights.size,
      }, null, 2));
      setStatus('Complete');
    } catch (error) {
      setStatus('Failed');
      setResult(String(error));
    } finally {
      await agent?.dispose();
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>PixelKit Laya verification</Text>
      <Text style={styles.label}>Local model directory</Text>
      <Text selectable style={styles.path}>{modelDir.uri}</Text>
      <Text style={styles.label}>Files</Text>
      <Text>model.onnx: {model.exists ? 'present' : 'missing'}</Text>
      <Text>model.onnx.data: {weights.exists ? 'present' : 'missing'}</Text>
      <Text>rl_agent_config.json: {config.exists ? 'present' : 'missing'}</Text>
      <Text>tokenizer.json: {tokenizer.exists ? 'present' : 'missing'}</Text>
      <Text style={styles.label}>Execution provider</Text>
      <View style={styles.row}>
        {(['cpu', 'xnnpack', 'nnapi'] as const).map((name) => (
          <Pressable key={name} accessibilityRole="button" accessibilityLabel={`Use ${name}`}
            disabled={busy} onPress={() => setProvider(name)}
            style={[styles.choice, provider === name && styles.selected]}>
            <Text style={provider === name && styles.selectedText}>{name}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Run Laya inference"
        disabled={busy} onPress={run} style={[styles.run, busy && styles.disabled]}>
        <Text style={styles.runText}>{busy ? 'Running…' : 'Run Laya inference'}</Text>
      </Pressable>
      <Text accessibilityRole="text" style={styles.label}>Status: {status}</Text>
      {!!result && <Text selectable style={styles.output}>{result}</Text>}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, paddingTop: 64, gap: 10, backgroundColor: '#f7f9fc', minHeight: '100%' },
  title: { fontSize: 25, fontWeight: '700', color: '#152b44' },
  label: { marginTop: 12, fontWeight: '700', color: '#152b44' },
  path: { fontSize: 12, color: '#305472' },
  row: { flexDirection: 'row', gap: 8 },
  choice: { padding: 12, borderRadius: 8, backgroundColor: '#e2eaf2' },
  selected: { backgroundColor: '#154d80' },
  selectedText: { color: '#fff' },
  run: { marginTop: 16, padding: 16, borderRadius: 8, backgroundColor: '#154d80' },
  disabled: { opacity: 0.6 },
  runText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  output: { fontFamily: 'monospace', fontSize: 12, color: '#152b44' },
});
