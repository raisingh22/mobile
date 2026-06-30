import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { OpticalReceiptPad, OpticalReceiptData } from '../../components/OpticalReceiptPad';
import { PdfService } from '../../services/PdfService';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';

const STORAGE_KEY = '@optical_receipt_last_no';

const formatReceiptNo = (num: number): string => {
  return num.toString().padStart(3, '0');
};

const initialData: OpticalReceiptData = {
  receiptNo: '080',
  date: new Date().toLocaleDateString('en-IN'),
  customerName: '',
  customerAddress: '',
  customerMobile: '',
  items: Array.from({ length: 5 }).map(() => ({ particulars: '', qty: '', rate: '', amount: '' })),
  total: '',
  advance: '',
  balance: '',
  rxDistanceRight: { sph: '', cyl: '', axis: '' },
  rxDistanceLeft: { sph: '', cyl: '', axis: '' },
  rxReadingRight: { sph: '', cyl: '', axis: '' },
  rxReadingLeft: { sph: '', cyl: '', axis: '' },
};

export function ReceiptPadScreen({ route, navigation }: any) {
  const getInitialState = (): OpticalReceiptData => {
    const rx = route?.params?.prescription;
    if (!rx) return initialData;
    
    // Helper to format sign (+/-) on power values
    const fmt = (val: number | null) => {
      if (val === null || val === undefined) return '';
      return val > 0 ? `+${val}` : val.toString();
    };

    return {
      receiptNo: '080',
      date: new Date().toLocaleDateString('en-IN'),
      customerName: rx.customer?.fullName || '',
      customerAddress: rx.customer?.address || '',
      customerMobile: rx.customer?.phone || '',
      items: Array.from({ length: 5 }).map(() => ({ particulars: '', qty: '', rate: '', amount: '' })),
      total: '',
      advance: '',
      balance: '',
      rxDistanceRight: {
        sph: fmt(rx.rightSphere),
        cyl: fmt(rx.rightCylinder),
        axis: rx.rightAxis !== null && rx.rightAxis !== undefined ? rx.rightAxis.toString() : '',
      },
      rxDistanceLeft: {
        sph: fmt(rx.leftSphere),
        cyl: fmt(rx.leftCylinder),
        axis: rx.leftAxis !== null && rx.leftAxis !== undefined ? rx.leftAxis.toString() : '',
      },
      rxReadingRight: {
        sph: rx.rightAdd !== null && rx.rightAdd !== undefined 
          ? fmt((rx.rightSphere || 0) + rx.rightAdd)
          : '',
        cyl: fmt(rx.rightCylinder),
        axis: rx.rightAxis !== null && rx.rightAxis !== undefined ? rx.rightAxis.toString() : '',
      },
      rxReadingLeft: {
        sph: rx.leftAdd !== null && rx.leftAdd !== undefined 
          ? fmt((rx.leftSphere || 0) + rx.leftAdd)
          : '',
        cyl: fmt(rx.leftCylinder),
        axis: rx.leftAxis !== null && rx.leftAxis !== undefined ? rx.leftAxis.toString() : '',
      },
    };
  };

  const [data, setData] = useState<OpticalReceiptData>(getInitialState);
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [savingDb, setSavingDb] = useState(false);
  const [hasScannedData, setHasScannedData] = useState(false);
  const [scannedCustomer, setScannedCustomer] = useState<{ fullName: string, phone: string, address: string } | null>(null);
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  // Load last receipt number on mount
  useEffect(() => {
    const loadLastReceiptNo = async () => {
      try {
        const lastNo = await AsyncStorage.getItem(STORAGE_KEY);
        let nextNo = 80; // Default start value matching photo
        
        if (lastNo !== null) {
          const parsed = parseInt(lastNo, 10);
          if (!isNaN(parsed)) {
            nextNo = parsed + 1;
          }
        } else {
          // Initialize storage with 80 if it's the very first time
          await AsyncStorage.setItem(STORAGE_KEY, '80');
        }

        const formatted = formatReceiptNo(nextNo);
        setData((prev) => ({
          ...prev,
          receiptNo: formatted,
        }));
      } catch (err) {
        console.error('Failed to load last receipt number:', err);
      }
    };

    loadLastReceiptNo();
  }, []);

  // Check if the current customer in the form is registered in the database (debounce check)
  useEffect(() => {
    const checkCustomerExistence = async () => {
      const name = data.customerName.trim();
      const mobile = data.customerMobile.replace(/\D/g, '');

      if (name.length >= 2 && mobile.length >= 10) {
        try {
          const customersRes = await axiosClient.get(ENDPOINTS.customers.list, { params: { limit: 100 } });
          const customers = customersRes.data?.data || [];
          
          const match = customers.find((c: any) => {
            const cPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
            return cPhone && mobile && (cPhone === mobile || cPhone.endsWith(mobile) || mobile.endsWith(cPhone));
          });

          if (match) {
            setScannedCustomer(null);
          } else {
            setScannedCustomer({
              fullName: data.customerName,
              phone: data.customerMobile,
              address: data.customerAddress || '',
            });
          }
        } catch (err) {
          console.error('Failed to check customer existence:', err);
        }
      } else {
        setScannedCustomer(null);
      }
    };

    const timer = setTimeout(() => {
      checkCustomerExistence();
    }, 600);

    return () => clearTimeout(timer);
  }, [data.customerName, data.customerMobile, data.customerAddress]);

  const incrementAndSaveReceiptNo = async () => {
    try {
      const currentNo = parseInt(data.receiptNo, 10);
      if (!isNaN(currentNo)) {
        await AsyncStorage.setItem(STORAGE_KEY, currentNo.toString());
        const nextFormatted = formatReceiptNo(currentNo + 1);
        setData((prev) => ({
          ...prev,
          receiptNo: nextFormatted,
        }));
      }
    } catch (err) {
      console.error('Failed to save receipt number:', err);
    }
  };

  const handleSaveScannedRecord = async () => {
    try {
      setSavingDb(true);
      
      const name = data.customerName.trim();
      const mobile = data.customerMobile.replace(/\D/g, '');

      if (!name || mobile.length < 10) {
        Toast.show({
          type: 'error',
          text1: 'Invalid Customer Details',
          text2: 'A valid customer name and 10-digit mobile number are required to save to database.',
        });
        setSavingDb(false);
        return;
      }

      // 1. Resolve or Create Customer profile
      let customerId = '';
      const customersRes = await axiosClient.get(ENDPOINTS.customers.list, { params: { limit: 100 } });
      const customers = customersRes.data?.data || [];
      const match = customers.find((c: any) => {
        const cPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
        return cPhone && mobile && (cPhone === mobile || cPhone.endsWith(mobile) || mobile.endsWith(cPhone));
      });

      if (match) {
        customerId = match.id;
        console.log('Using existing customer ID:', customerId);
      } else {
        const createRes = await axiosClient.post(ENDPOINTS.customers.create, {
          fullName: name,
          phone: data.customerMobile,
          address: data.customerAddress || '',
        });
        customerId = createRes.data?.id || createRes.data?.data?.id;
        console.log('Created new customer, ID:', customerId);
      }

      if (!customerId) {
        throw new Error('Failed to resolve or create customer account.');
      }

      // 2. Create Prescription if refraction metrics are present
      let prescriptionId: string | null = null;
      const hasRightRx = data.rxDistanceRight.sph || data.rxDistanceRight.cyl || data.rxDistanceRight.axis;
      const hasLeftRx = data.rxDistanceLeft.sph || data.rxDistanceLeft.cyl || data.rxDistanceLeft.axis;

      if (hasRightRx || hasLeftRx) {
        const parseVal = (v: string): number | null => {
          if (!v) return null;
          const parsed = parseFloat(v);
          return isNaN(parsed) ? null : parsed;
        };
        const parseAxis = (v: string): number | null => {
          if (!v) return null;
          const parsed = parseInt(v, 10);
          return isNaN(parsed) ? null : parsed;
        };

        const rxPayload = {
          doctorName: 'राज आई केयर एण्ड ऑप्टिकल्स',
          prescriptionDate: new Date().toISOString().split('T')[0],
          rightSphere: parseVal(data.rxDistanceRight.sph),
          rightCylinder: parseVal(data.rxDistanceRight.cyl),
          rightAxis: parseAxis(data.rxDistanceRight.axis),
          rightAdd: parseVal(data.rxReadingRight.sph) && parseVal(data.rxDistanceRight.sph) 
            ? Number((parseVal(data.rxReadingRight.sph) || 0) - (parseVal(data.rxDistanceRight.sph) || 0))
            : null,
          leftSphere: parseVal(data.rxDistanceLeft.sph),
          leftCylinder: parseVal(data.rxDistanceLeft.cyl),
          leftAxis: parseAxis(data.rxDistanceLeft.axis),
          leftAdd: parseVal(data.rxReadingLeft.sph) && parseVal(data.rxDistanceLeft.sph) 
            ? Number((parseVal(data.rxReadingLeft.sph) || 0) - (parseVal(data.rxDistanceLeft.sph) || 0))
            : null,
          pupillaryDistance: null,
          notes: 'Imported from Receipt Pad Scan',
        };

        const rxRes = await axiosClient.post(ENDPOINTS.prescriptions.create(customerId), rxPayload);
        prescriptionId = rxRes.data?.id || rxRes.data?.data?.id;
        console.log('Created prescription, ID:', prescriptionId);
      }

      // 3. Create Order if items are present
      const total = parseFloat(data.total) || 0;
      const advance = parseFloat(data.advance) || 0;
      const hasItems = data.items.some((it: any) => it.particulars);
      
      if (hasItems || total > 0) {
        const paymentStatus = advance >= total ? 'PAID' : (advance > 0 ? 'PARTIALLY_PAID' : 'UNPAID');
        const itemNotes = data.items
          .filter((it: any) => it.particulars)
          .map((it: any) => `${it.particulars} (Qty: ${it.qty || 1}, Rate: ${it.rate || 0})`)
          .join(', ');

        const orderPayload = {
          customerId,
          prescriptionId: prescriptionId || null,
          frameName: 'Scanned Frame',
          quantity: 1,
          subtotal: total,
          discount: 0,
          tax: 0,
          paidAmount: advance,
          status: 'PENDING',
          paymentStatus,
          notes: itemNotes ? `Items: ${itemNotes}` : 'Imported from Receipt Pad Scan',
        };

        await axiosClient.post(ENDPOINTS.orders.create, orderPayload);
        console.log('Created order successfully');
      }

      Toast.show({
        type: 'success',
        text1: 'Record Saved Successfully',
        text2: 'Customer, prescription, and order details linked in database.',
      });

      setHasScannedData(false);
      setScannedCustomer(null);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Verification failed';
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: errMsg,
      });
    } finally {
      setSavingDb(false);
    }
  };

  const handleRegisterScannedCustomer = () => {
    if (!scannedCustomer) return;
    navigation.navigate('AddEditCustomer', {
      prefill: {
        fullName: scannedCustomer.fullName,
        phone: scannedCustomer.phone,
        address: scannedCustomer.address,
      },
    });
  };

  const handleClearCustomerDetails = () => {
    setData((prev) => ({
      ...prev,
      customerName: '',
      customerAddress: '',
      customerMobile: '',
    }));
    setScannedCustomer(null);
    Toast.show({
      type: 'info',
      text1: 'Cleared Details',
      text2: 'Customer fields have been cleared.',
    });
  };

  const handleDiscardScan = () => {
    setHasScannedData(false);
    Toast.show({
      type: 'info',
      text1: 'Scan Dismissed',
      text2: 'Scanned record won\'t be saved to DB.',
    });
  };

  const handleScanPress = () => {
    Alert.alert(
      'Scan Receipt/Prescription',
      'Choose whether to take a new photo or select one from your library.',
      [
        {
          text: 'Take Photo',
          onPress: () => performScan(ImagePicker.launchCameraAsync),
        },
        {
          text: 'Choose from Library',
          onPress: () => performScan(ImagePicker.launchImageLibraryAsync),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const performScan = async (launcher: any) => {
    try {
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      const libraryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!cameraPerm.granted || !libraryPerm.granted) {
        Toast.show({
          type: 'error',
          text1: 'Permissions Required',
          text2: 'Camera and Photo Library access are required to scan.',
        });
        return;
      }

      const result = await launcher({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const base64Data = asset.base64;

      if (!base64Data) {
        Toast.show({
          type: 'error',
          text1: 'Invalid Image',
          text2: 'Could not read image base64 data.',
        });
        return;
      }

      setScanning(true);
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

      if (!apiKey) {
        Toast.show({
          type: 'error',
          text1: 'Gemini API Key Missing',
          text2: 'Set EXPO_PUBLIC_GEMINI_API_KEY in your .env file.',
          visibilityTime: 6000,
        });
        setScanning(false);
        return;
      }

      const promptText = `
        Analyze this optical shop receipt/prescription image. Extract all readable text and numbers.
        Map them into a JSON object matching this exact TypeScript structure:
        {
          "customerName": string,
          "customerAddress": string,
          "customerMobile": string,
          "items": [
            { "particulars": string, "qty": string, "rate": string, "amount": string },
            { "particulars": string, "qty": string, "rate": string, "amount": string },
            { "particulars": string, "qty": string, "rate": string, "amount": string },
            { "particulars": string, "qty": string, "rate": string, "amount": string },
            { "particulars": string, "qty": string, "rate": string, "amount": string }
          ],
          "total": string,
          "advance": string,
          "balance": string,
          "rxDistanceRight": { "sph": string, "cyl": string, "axis": string },
          "rxDistanceLeft": { "sph": string, "cyl": string, "axis": string },
          "rxReadingRight": { "sph": string, "cyl": string, "axis": string },
          "rxReadingLeft": { "sph": string, "cyl": string, "axis": string }
        }
        
        Rules:
        1. "items" array must contain exactly 5 elements. Pad empty elements with empty string values.
        2. Clean any currency indicators like "₹" or "Rs" from total, advance, balance, and item rate/amount fields (return only the number).
        3. Do NOT wrap the JSON in Markdown code block formatting. Return only raw JSON.
        4. If a field is not present or unreadable, return empty string "".
      `;

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const responseJson = await response.json();
      const generatedText = responseJson.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('No text returned from Gemini OCR.');
      }

      let cleanedJson = generatedText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);

      if (!parsed.items || !Array.isArray(parsed.items)) {
        parsed.items = [];
      }
      while (parsed.items.length < 5) {
        parsed.items.push({ particulars: '', qty: '', rate: '', amount: '' });
      }
      if (parsed.items.length > 5) {
        parsed.items = parsed.items.slice(0, 5);
      }

      // State updates to data will trigger checking in useEffect
      setHasScannedData(true);

      setData((prev) => ({
        ...prev,
        customerName: parsed.customerName || '',
        customerAddress: parsed.customerAddress || '',
        customerMobile: parsed.customerMobile || '',
        items: parsed.items,
        total: parsed.total || '',
        advance: parsed.advance || '',
        balance: parsed.balance || '',
        rxDistanceRight: {
          sph: parsed.rxDistanceRight?.sph || '',
          cyl: parsed.rxDistanceRight?.cyl || '',
          axis: parsed.rxDistanceRight?.axis || '',
        },
        rxDistanceLeft: {
          sph: parsed.rxDistanceLeft?.sph || '',
          cyl: parsed.rxDistanceLeft?.cyl || '',
          axis: parsed.rxDistanceLeft?.axis || '',
        },
        rxReadingRight: {
          sph: parsed.rxReadingRight?.sph || '',
          cyl: parsed.rxReadingRight?.cyl || '',
          axis: parsed.rxReadingRight?.axis || '',
        },
        rxReadingLeft: {
          sph: parsed.rxReadingLeft?.sph || '',
          cyl: parsed.rxReadingLeft?.cyl || '',
          axis: parsed.rxReadingLeft?.axis || '',
        },
      }));

      Toast.show({
        type: 'success',
        text1: 'Scanned Successfully',
        text2: 'Optical details pre-filled from receipt image.',
      });
    } catch (err) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'AI Scan Failed',
        text2: 'Could not extract data from the receipt image.',
      });
    } finally {
      setScanning(false);
    }
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      const uri = await PdfService.generateOpticalReceiptPdf(data);
      await Print.printAsync({ uri });
      Toast.show({ type: 'success', text1: 'Printed Successfully', text2: 'Receipt sent to printer.' });
      await incrementAndSaveReceiptNo();
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Print Failed', text2: 'Could not send document to printer.' });
    } finally {
      setPrinting(false);
    }
  };

  const handleShare = async () => {
    try {
      setSharing(true);
      const uri = await PdfService.generateOpticalReceiptPdf(data);
      const filename = `Receipt_${data.customerName ? data.customerName.replace(/\s+/g, '_') : 'Customer'}_${data.receiptNo}.pdf`;
      await PdfService.shareFile(uri, filename);
      await incrementAndSaveReceiptNo();
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Sharing Failed', text2: 'Could not open sharing panel.' });
    } finally {
      setSharing(false);
    }
  };

  const handleReset = async () => {
    try {
      setHasScannedData(false);
      setScannedCustomer(null);
      const lastNo = await AsyncStorage.getItem(STORAGE_KEY);
      let nextNo = 80;
      if (lastNo !== null) {
        const parsed = parseInt(lastNo, 10);
        if (!isNaN(parsed)) {
          nextNo = parsed + 1;
        }
      }
      setData({
        ...initialData,
        receiptNo: formatReceiptNo(nextNo),
        date: new Date().toLocaleDateString('en-IN'),
      });
      Toast.show({ type: 'info', text1: 'Cleared', text2: 'Receipt pad cleared.' });
    } catch (err) {
      setData({
        ...initialData,
        date: new Date().toLocaleDateString('en-IN'),
      });
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundSolid }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Optical Receipt Pad</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleScanPress} style={styles.scanBtn} disabled={scanning}>
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleReset} style={styles.resetBtn} disabled={scanning}>
              <Ionicons name="refresh" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={[styles.instructions, { color: colors.textSecondary }]}>
              Enter receipt/prescription details below. Values will be format-aligned for standard A5 thermal receipt printing.
            </Text>
            
            {/* Save Scanned Record Banner */}
            {hasScannedData ? (
              <View style={[styles.banner, { backgroundColor: '#10b981' + '10', borderColor: '#10b981', marginBottom: 16 }]}>
                <Ionicons name="cloud-upload-outline" size={20} color="#10b981" style={styles.bannerIcon} />
                <View style={styles.bannerContent}>
                  <Text style={[styles.bannerTitle, { color: colors.text }]}>Scanned Record Ready</Text>
                  <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
                    Save scanned details (customer info, prescription, and billing items) directly to database.
                  </Text>
                </View>
                <View style={styles.bannerActions}>
                  <TouchableOpacity onPress={handleSaveScannedRecord} style={[styles.bannerBtn, { backgroundColor: '#10b981', marginRight: 8 }]} disabled={savingDb}>
                    {savingDb ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.bannerBtnText}>Save to DB</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDiscardScan} style={[styles.bannerBtn, { backgroundColor: '#f43f5e' }]} disabled={savingDb}>
                    <Ionicons name="close-outline" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Scanned Customer Registration Banner (for manual typing) */
              scannedCustomer && (
                <View style={[styles.banner, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
                  <Ionicons name="person-add-outline" size={20} color={colors.primary} style={styles.bannerIcon} />
                  <View style={styles.bannerContent}>
                    <Text style={[styles.bannerTitle, { color: colors.text }]}>Scanned Customer Not Found</Text>
                    <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
                      {scannedCustomer.fullName} ({scannedCustomer.phone}) is not in your patient list.
                    </Text>
                  </View>
                  <View style={styles.bannerActions}>
                    <TouchableOpacity onPress={handleRegisterScannedCustomer} style={[styles.bannerBtn, { backgroundColor: colors.primary, marginRight: 8 }]}>
                      <Text style={styles.bannerBtnText}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleClearCustomerDetails} style={[styles.bannerBtn, { backgroundColor: '#f43f5e' }]}>
                      <Ionicons name="trash-outline" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            )}

            <OpticalReceiptPad data={data} onChange={setData} />
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 12 }]}>
          <Button
            title="Print Receipt"
            variant="primary"
            icon="print-outline"
            isLoading={printing}
            disabled={sharing}
            onPress={handlePrint}
            style={{ flex: 1 }}
          />
          <Button
            title="Share Image"
            variant="outline"
            icon="share-social-outline"
            isLoading={sharing}
            disabled={printing}
            onPress={handleShare}
            style={{ flex: 1 }}
          />
        </View>
      </KeyboardAvoidingView>

      {scanning && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: '#ffffff' }]}>AI Scanning Receipt...</Text>
          <Text style={[styles.loadingSubtext, { color: '#cccccc' }]}>Analyzing handwriting and numbers</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanBtn: {
    padding: 4,
    marginRight: 14,
  },
  resetBtn: {
    padding: 4,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
  },
  instructions: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerIcon: {
    marginRight: 10,
  },
  bannerContent: {
    flex: 1,
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerText: {
    fontSize: 12,
    marginTop: 2,
  },
  bannerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderTopWidth: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingSubtext: {
    marginTop: 6,
    fontSize: 12,
  },
});
