// screens/BackupScreen.tsx — Backup e Ripristino cifrato (.turnover). Offline, single-user.
// Crea: password+conferma+hint → cifra lo snapshot store → salva/condivide file .turnover.
// Importa: seleziona file → password → verifica integrità → ripristino completo (o errore chiaro).
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import Icon from '../components/Icon';
import BackButton from '../components/BackButton';
import GlassCard from '../components/GlassCard';
import PressableScale from '../components/PressableScale';
import { useStore } from '../hooks/useStore';
import { useToast } from '../hooks/useToast';
import { createBackup, restoreBackup, backupFileName, BackupError, BackupFile } from '../services/backup';
import { exportPersonalization, importPersonalization } from '../services/storage';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { typography } from '../design/typography';

export default function BackupScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { exportBackup, importBackup } = useStore();

  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);

  const [restorePwd, setRestorePwd] = useState('');
  const [picked, setPicked] = useState<{ name: string; file: BackupFile } | null>(null);

  const doBackup = async () => {
    if (pwd.length < 6) { toast.show('La password deve avere almeno 6 caratteri', 'warning'); return; }
    if (pwd !== confirm) { toast.show('Le password non coincidono', 'warning'); return; }
    setBusy(true);
    try {
      const payload = { v: 1, store: exportBackup(), personalization: await exportPersonalization() }; // dati + profilo/personalizzazione
      const file = createBackup(payload, pwd, hint.trim() || undefined);
      const name = backupFileName();
      const uri = FileSystem.cacheDirectory + name;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(file), { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/octet-stream', dialogTitle: 'Salva backup TURNOVER' });
        toast.show('Backup cifrato creato', 'success');
      } else {
        toast.show('Backup salvato: ' + name, 'success');
      }
      setPwd(''); setConfirm(''); setHint('');
    } catch (e) {
      toast.show('Backup non riuscito su questo dispositivo', 'error');
    } finally { setBusy(false); }
  };

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' });
      if (res.canceled || !res.assets || !res.assets[0]) return;
      const asset = res.assets[0];
      const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      let file: BackupFile;
      try { file = JSON.parse(text); } catch { toast.show('File non valido', 'error'); return; }
      if (!file || file.encrypted !== true) { toast.show('Non è un backup TURNOVER valido', 'error'); return; }
      setPicked({ name: asset.name || 'backup.turnover', file });
    } catch { toast.show('Impossibile aprire il file', 'error'); }
  };

  const doRestore = async () => {
    if (!picked) return;
    if (!restorePwd) { toast.show('Inserisci la password del backup', 'warning'); return; }
    setBusy(true);
    try {
      const decoded = restoreBackup<any>(picked.file, restorePwd);
      // compat: backup nuovi = { store, personalization }; backup vecchi = stringa snapshot
      const storeStr = typeof decoded === 'string' ? decoded : decoded?.store;
      const res = importBackup(storeStr);
      if (res.ok) {
        if (decoded && typeof decoded !== 'string' && decoded.personalization) { try { await importPersonalization(decoded.personalization); } catch { /* personalizzazione non bloccante */ } }
        toast.show('Ripristino completato', 'success'); setPicked(null); setRestorePwd(''); setTimeout(() => router.replace('/'), 600);
      } else { toast.show(res.error || 'Ripristino non riuscito', 'error'); }
    } catch (e) {
      const msg = e instanceof BackupError ? e.message : 'Ripristino non riuscito';
      toast.show(msg, 'error'); // password errata/file corrotto → nessun dato modificato
    } finally { setBusy(false); }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.s }]}>
        <BackButton />
        <View style={{ flex: 1 }}><Text style={styles.pageTitle}>Backup e Ripristino</Text><Text style={styles.subtitle}>Dati cifrati, solo su questo dispositivo</Text></View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>
        {/* CREA BACKUP */}
        <Text style={styles.section}>Crea backup</Text>
        <GlassCard>
          <Text style={styles.note}>Il backup è cifrato con la tua password (AES-256). La password non è salvata e non è recuperabile: senza di essa il file non è leggibile.</Text>
          <Field label="Password" value={pwd} onChange={setPwd} secure placeholder="Almeno 6 caratteri" />
          <Field label="Conferma password" value={confirm} onChange={setConfirm} secure placeholder="Ripeti la password" />
          <Field label="Suggerimento (opzionale)" value={hint} onChange={setHint} placeholder="Promemoria non sensibile" />
          <Pressable onPress={doBackup} disabled={busy} style={[styles.cta, { backgroundColor: colors.green, opacity: busy ? 0.6 : 1 }]}>
            <Icon name="save-outline" size={20} color="#000" /><Text style={styles.ctaTxt}>Crea Backup</Text>
          </Pressable>
        </GlassCard>

        {/* RIPRISTINO */}
        <Text style={[styles.section, { marginTop: spacing.h }]}>Ripristina backup</Text>
        <GlassCard>
          <Text style={styles.note}>Seleziona un file .turnover, inserisci la password e verifica l'integrità prima del ripristino. In caso di password errata o file corrotto, i dati attuali non vengono modificati.</Text>
          <Pressable onPress={pickFile} style={[styles.pick, { borderColor: colors.border }]}>
            <Icon name="document-outline" size={20} color={colors.blue} />
            <Text style={styles.pickTxt} numberOfLines={1}>{picked ? picked.name : 'Seleziona file .turnover'}</Text>
          </Pressable>
          {picked ? (
            <>
              {picked.file.hint ? <Text style={styles.hintBox}>Suggerimento password: {picked.file.hint}</Text> : null}
              <Field label="Password del backup" value={restorePwd} onChange={setRestorePwd} secure placeholder="Password usata per il backup" />
              <Pressable onPress={doRestore} disabled={busy} style={[styles.cta, { backgroundColor: colors.blue, opacity: busy ? 0.6 : 1 }]}>
                <Icon name="cloud-download-outline" size={20} color="#fff" /><Text style={[styles.ctaTxt, { color: '#fff' }]}>Verifica e Ripristina</Text>
              </Pressable>
            </>
          ) : null}
        </GlassCard>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChange, secure, placeholder }: { label: string; value: string; onChange: (v: string) => void; secure?: boolean; placeholder?: string }) {
  return (
    <View style={{ marginTop: spacing.m }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} secureTextEntry={secure} placeholder={placeholder} placeholderTextColor={colors.textDisabled}
        autoCapitalize="none" autoCorrect={false} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: spacing.xxl, paddingBottom: spacing.s, flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { ...typography.pageTitle, color: colors.textPrimary },
  subtitle: { ...typography.secondary, color: colors.textDisabled, marginTop: 2 },
  section: { ...typography.cardTitle, color: colors.textPrimary, marginBottom: spacing.m },
  note: { ...typography.caption, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.s },
  fieldLabel: { ...typography.secondary, color: colors.textSecondary, marginBottom: spacing.xs },
  input: { height: 52, borderRadius: radius.input, backgroundColor: colors.glassStrong, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.l, color: colors.textPrimary, ...typography.body },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 56, borderRadius: radius.button, marginTop: spacing.l },
  ctaTxt: { ...typography.body, fontWeight: '700', color: '#000' },
  pick: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, height: 52, borderRadius: radius.input, borderWidth: 1, borderStyle: 'dashed', paddingHorizontal: spacing.l, marginTop: spacing.s },
  pickTxt: { ...typography.body, color: colors.textSecondary, flex: 1 },
  hintBox: { ...typography.caption, color: colors.warning, marginTop: spacing.m, backgroundColor: colors.glass, padding: spacing.m, borderRadius: radius.smallCard },
});
