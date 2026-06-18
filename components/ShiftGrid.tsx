// components/ShiftGrid.tsx

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Piano, Staff } from '../types';
import { DOW } from '../utils/constants';
import { daysInMonth, isWeekend, jsDow } from '../utils/helpers';
import { getCell, getEmptyCell } from '../services/engine';
import Avatar from './Avatar';
import ShiftBadge from './ShiftBadge';
import { colors } from '../design/colors';

const NAME_W = 124;
const CELL_W = 44;
const ROW_H = 52;

interface Props {
  staff: Staff[];
  piano: Piano;
  year: number;
  month: number;
  onCellPress: (infId: string, day: number) => void;
  allStaff: Staff[];
}

export default function ShiftGrid({ staff, piano, year, month, onCellPress, allStaff }: Props) {
  const dim = daysInMonth(year, month);
  const days = Array.from({ length: dim }, (_, i) => i + 1);

  if (!staff.length) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: colors.textSecondary }}>Nessun membro per questo filtro.</Text>
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      {/* fixed name column */}
      <View style={{ width: NAME_W }}>
        <View style={[styles.corner, { height: ROW_H, borderColor: colors.divider, backgroundColor: colors.elevated }]}>
          <Text style={[styles.cornerTxt, { color: colors.textSecondary }]}>STAFF</Text>
        </View>
        {staff.map((inf) => (
          <View key={inf.id} style={[styles.nameCell, { height: ROW_H, borderColor: colors.divider }]}>
            <Avatar nome={inf.nome} size={28} />
            <View style={styles.nameTextWrap}>
              <Text style={[styles.nameTxt, { color: colors.textPrimary }]} numberOfLines={1}>{inf.nome}</Text>
              <Text style={[styles.nameSub, { color: colors.textDisabled }]} numberOfLines={1}>{inf.qualifica}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* scrollable day grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
        <View>
          <View style={{ flexDirection: 'row' }}>
            {days.map((d) => {
              const we = isWeekend(year, month, d);
              return (
                <View key={d} style={[styles.dayHead, { width: CELL_W, height: ROW_H, borderColor: colors.divider, backgroundColor: we ? colors.elevated : 'transparent' }]}>
                  <Text style={[styles.dayNum, { color: we ? colors.red : colors.textPrimary }]}>{d}</Text>
                  <Text style={[styles.dayDow, { color: colors.textDisabled }]}>{DOW[jsDow(year, month, d)]}</Text>
                </View>
              );
            })}
          </View>
          {staff.map((inf) => (
            <View key={inf.id} style={{ flexDirection: 'row' }}>
              {days.map((d) => {
                const c = getCell(piano, inf.id, d) || getEmptyCell();
                return (
                  <Pressable
                    key={d}
                    onPress={() => onCellPress(inf.id, d)}
                    style={[styles.cell, { width: CELL_W, height: ROW_H, borderColor: colors.divider }]}
                  >
                    <ShiftBadge cell={c} size={34} />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flexDirection: 'row' },
  empty: { padding: 30, alignItems: 'center' },
  corner: { justifyContent: 'center', paddingHorizontal: 10, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  cornerTxt: { fontSize: 11, fontWeight: '700' },
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  nameTextWrap: { flex: 1, minWidth: 0 },
  nameTxt: { fontSize: 12, fontWeight: '600' },
  nameSub: { fontSize: 11 },
  dayHead: { alignItems: 'center', justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  dayNum: { fontSize: 12, fontWeight: '700' },
  dayDow: { fontSize: 11, textTransform: 'uppercase' },
  cell: { alignItems: 'center', justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
});
