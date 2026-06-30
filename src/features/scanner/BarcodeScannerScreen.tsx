import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

export function BarcodeScannerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [scanning, setScanning] = useState(false);

  const handleMockScan = () => {
    setScanning(true);
    // Simulate lookup of SKU / barcode
    setTimeout(() => {
      setScanning(false);
      Toast.show({
        type: 'success',
        text1: 'Barcode Scanned',
        text2: 'Product ID: SKU-RAYBAN-4022 matching 1 item.',
      });
      navigation.goBack();
    }, 1500);
  };

  return (
    <View style={s.screen}>
      {/* Header Bar */}
      <View style={[s.header, { paddingTop: insets.top > 0 ? insets.top + 8 : 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#06b6d4" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Scan Barcode / QR</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Camera View Area stub */}
      <View style={s.scannerArea}>
        <View style={s.overlay}>
          {/* Top segment overlay */}
          <View style={[s.layer, s.layerTop]} />
          {/* Middle row containing targeting box */}
          <View style={s.layerMiddle}>
            <View style={s.layerSide} />
            <View style={s.targetBox}>
              {/* Corner brackets */}
              <View style={[s.corner, s.tl]} />
              <View style={[s.corner, s.tr]} />
              <View style={[s.corner, s.bl]} />
              <View style={[s.corner, s.br]} />
              
              {scanning && (
                <View style={s.scanLine}>
                  <ActivityIndicator size="small" color="#06b6d4" />
                </View>
              )}
            </View>
            <View style={s.layerSide} />
          </View>
          {/* Bottom segment overlay */}
          <View style={[s.layer, s.layerBottom]}>
            <Text style={s.hintText}>Align barcode or QR code within the frame</Text>
            
            <TouchableOpacity
              onPress={handleMockScan}
              disabled={scanning}
              style={s.scanBtn}
            >
              <Ionicons name="scan" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.scanBtnText}>
                {scanning ? 'Looking up SKU...' : 'Mock Camera Capture'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#11182780', borderBottomWidth: 1, borderBottomColor: '#1f2937',
    paddingHorizontal: 16, paddingBottom: 14,
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  scannerArea: { flex: 1, position: 'relative' },
  overlay: { ...StyleSheet.absoluteFill },
  layer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  layerTop: { flex: 1.5 },
  layerMiddle: { flexDirection: 'row', height: 250 },
  layerSide: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  targetBox: {
    width: 250, height: 250, position: 'relative',
    alignItems: 'center', justifyContent: 'center',
  },
  corner: {
    position: 'absolute', width: 20, height: 20,
    borderColor: '#06b6d4', borderWidth: 3,
  },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  scanLine: {
    width: '80%', height: 2, backgroundColor: '#06b6d4',
    shadowColor: '#06b6d4', shadowOpacity: 0.8, shadowRadius: 4,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  layerBottom: {
    flex: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  hintText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#06b6d4', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 24,
  },
  scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
