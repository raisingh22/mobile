import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export interface OpticalReceiptData {
  receiptNo: string;
  date: string;
  customerName: string;
  customerAddress: string;
  customerMobile: string;
  items: Array<{
    particulars: string;
    qty: string;
    rate: string;
    amount: string;
  }>;
  total: string;
  advance: string;
  balance: string;
  rxDistanceRight: { sph: string; cyl: string; axis: string };
  rxDistanceLeft: { sph: string; cyl: string; axis: string };
  rxReadingRight: { sph: string; cyl: string; axis: string };
  rxReadingLeft: { sph: string; cyl: string; axis: string };
}

interface OpticalReceiptPadProps {
  data: OpticalReceiptData;
  onChange: (updater: (prev: OpticalReceiptData) => OpticalReceiptData) => void;
}

export function OpticalReceiptPad({ data, onChange }: OpticalReceiptPadProps) {
  
  const handleItemChange = (index: number, field: 'particulars' | 'qty' | 'rate', value: string) => {
    onChange((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };
      
      // Auto-calculate amount if qty and rate are numbers
      if (field === 'qty' || field === 'rate') {
        const qtyNum = parseFloat(item.qty) || 0;
        const rateNum = parseFloat(item.rate) || 0;
        item.amount = qtyNum && rateNum ? (qtyNum * rateNum).toString() : '';
      }
      
      newItems[index] = item;
      
      // Auto-calculate total
      const totalNum = newItems.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0);
      const advanceNum = parseFloat(prev.advance) || 0;
      const balanceNum = Math.max(0, totalNum - advanceNum);
      
      return {
        ...prev,
        items: newItems,
        total: totalNum > 0 ? totalNum.toString() : '',
        balance: balanceNum > 0 ? balanceNum.toString() : '',
      };
    });
  };

  const handleFieldChange = (field: keyof OpticalReceiptData, value: string) => {
    onChange((prev) => {
      const updated = { ...prev, [field]: value };
      
      // If advance changed, recalculate balance
      if (field === 'advance') {
        const totalNum = parseFloat(prev.total) || 0;
        const advanceNum = parseFloat(value) || 0;
        const balanceNum = Math.max(0, totalNum - advanceNum);
        updated.balance = balanceNum > 0 ? balanceNum.toString() : '';
      }
      
      return updated;
    });
  };

  const handleRxChange = (
    eye: 'rxDistanceRight' | 'rxDistanceLeft' | 'rxReadingRight' | 'rxReadingLeft',
    field: 'sph' | 'cyl' | 'axis',
    value: string
  ) => {
    onChange((prev) => ({
      ...prev,
      [eye]: {
        ...prev[eye],
        [field]: value,
      },
    }));
  };

  return (
    <View style={styles.padContainer}>
      <View style={styles.receiptBookPage}>
        {/* Header Title */}
        <Text style={styles.mainTitle}>राज आई केयर एण्ड ऑप्टिकल्स</Text>
        <Text style={styles.subTitle}>स्टेट बैंक के सामने, टपूकड़ा बाईपास, (राज.)</Text>

        {/* Metadata: No & Date */}
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <Text style={styles.lbl}>No. </Text>
            <TextInput
              style={[styles.input, styles.noInput]}
              value={data.receiptNo}
              onChangeText={(val) => handleFieldChange('receiptNo', val)}
              placeholder="080"
              placeholderTextColor="#888"
            />
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.lbl}>Date : </Text>
            <TextInput
              style={[styles.input, styles.dateInput]}
              value={data.date}
              onChangeText={(val) => handleFieldChange('date', val)}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#888"
            />
          </View>
        </View>

        {/* Customer fields */}
        <View style={styles.fieldRow}>
          <Text style={styles.lbl}>Name </Text>
          <TextInput
            style={[styles.input, styles.fillInput]}
            value={data.customerName}
            onChangeText={(val) => handleFieldChange('customerName', val)}
          />
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.lbl}>Add. : </Text>
          <TextInput
            style={[styles.input, styles.addressInput]}
            value={data.customerAddress}
            onChangeText={(val) => handleFieldChange('customerAddress', val)}
          />
          <Text style={[styles.lbl, { marginLeft: 10 }]}>Mob. : </Text>
          <TextInput
            style={[styles.input, styles.mobileInput]}
            value={data.customerMobile}
            onChangeText={(val) => handleFieldChange('customerMobile', val)}
            keyboardType="phone-pad"
          />
        </View>

        {/* Billing Table */}
        <View style={styles.tableBorder}>
          {/* Header Row */}
          <View style={[styles.tr, styles.trHeader]}>
            <Text style={[styles.th, styles.colNo]}>S. No.</Text>
            <Text style={[styles.th, styles.colParticulars]}>PARTICULARS</Text>
            <Text style={[styles.th, styles.colQty]}>QTY.</Text>
            <Text style={[styles.th, styles.colRate]}>RATE</Text>
            <Text style={[styles.th, styles.colAmount]}>AMOUNT</Text>
          </View>

          {/* Table Rows (Fixed at 5 rows to mimic physical space) */}
          {data.items.map((item, idx) => (
            <View key={idx} style={[styles.tr, styles.trBody]}>
              <Text style={[styles.td, styles.colNo, styles.textCenter]}>{idx + 1}</Text>
              <TextInput
                style={[styles.tdInput, styles.colParticulars]}
                value={item.particulars}
                onChangeText={(val) => handleItemChange(idx, 'particulars', val)}
              />
              <TextInput
                style={[styles.tdInput, styles.colQty, styles.textCenter]}
                value={item.qty}
                onChangeText={(val) => handleItemChange(idx, 'qty', val)}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.tdInput, styles.colRate, styles.textRight]}
                value={item.rate}
                onChangeText={(val) => handleItemChange(idx, 'rate', val)}
                keyboardType="numeric"
              />
              <Text style={[styles.td, styles.colAmount, styles.textRight]}>
                {item.amount ? `₹${item.amount}` : ''}
              </Text>
            </View>
          ))}

          {/* TOTAL */}
          <View style={styles.totalsRow}>
            <View style={styles.totalsLabelCol}>
              <Text style={styles.totalsLbl}>TOTAL</Text>
            </View>
            <View style={styles.totalsValCol}>
              <TextInput
                style={[styles.totalsInput]}
                value={data.total}
                onChangeText={(val) => handleFieldChange('total', val)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* ADVANCE */}
          <View style={styles.totalsRow}>
            <View style={styles.totalsLabelCol}>
              <Text style={styles.totalsLbl}>ADVANCE</Text>
            </View>
            <View style={styles.totalsValCol}>
              <TextInput
                style={[styles.totalsInput]}
                value={data.advance}
                onChangeText={(val) => handleFieldChange('advance', val)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* BALANCE */}
          <View style={styles.totalsRow}>
            <View style={styles.totalsLabelCol}>
              <Text style={styles.totalsLbl}>BALANCE</Text>
            </View>
            <View style={styles.totalsValCol}>
              <TextInput
                style={[styles.totalsInput, { fontWeight: 'bold' }]}
                value={data.balance}
                onChangeText={(val) => handleFieldChange('balance', val)}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Footer Area: Prescription Grid + Signature */}
        <View style={styles.footerContainer}>
          {/* Prescription Box */}
          <View style={styles.rxContainer}>
            {/* Rx Columns Title */}
            <View style={styles.rxHeaderRow}>
              <View style={styles.rxThEmpty} />
              <View style={styles.rxThRight}>
                <Text style={styles.rxHeaderTitle}>RIGHT</Text>
                <View style={styles.rxSubHeaderRow}>
                  <Text style={styles.rxSubTh}>SPH</Text>
                  <Text style={styles.rxSubTh}>CYL</Text>
                  <Text style={styles.rxSubTh}>AXIS</Text>
                </View>
              </View>
              <View style={styles.rxThLeft}>
                <Text style={styles.rxHeaderTitle}>LEFT</Text>
                <View style={styles.rxSubHeaderRow}>
                  <Text style={styles.rxSubTh}>SPH</Text>
                  <Text style={styles.rxSubTh}>CYL</Text>
                  <Text style={styles.rxSubTh}>AXIS</Text>
                </View>
              </View>
            </View>

            {/* Distance Row */}
            <View style={styles.rxRow}>
              <View style={styles.rxLabelCol}>
                <Text style={styles.rxRowLabel}>D</Text>
                <Text style={styles.rxRowSubLabel}>I S T</Text>
              </View>
              <TextInput
                style={styles.rxInput}
                value={data.rxDistanceRight.sph}
                onChangeText={(val) => handleRxChange('rxDistanceRight', 'sph', val)}
              />
              <TextInput
                style={styles.rxInput}
                value={data.rxDistanceRight.cyl}
                onChangeText={(val) => handleRxChange('rxDistanceRight', 'cyl', val)}
              />
              <TextInput
                style={styles.rxInput}
                value={data.rxDistanceRight.axis}
                onChangeText={(val) => handleRxChange('rxDistanceRight', 'axis', val)}
              />
              <TextInput
                style={styles.rxInput}
                value={data.rxDistanceLeft.sph}
                onChangeText={(val) => handleRxChange('rxDistanceLeft', 'sph', val)}
              />
              <TextInput
                style={styles.rxInput}
                value={data.rxDistanceLeft.cyl}
                onChangeText={(val) => handleRxChange('rxDistanceLeft', 'cyl', val)}
              />
              <TextInput
                style={styles.rxInput}
                value={data.rxDistanceLeft.axis}
                onChangeText={(val) => handleRxChange('rxDistanceLeft', 'axis', val)}
              />
            </View>

            {/* Reading Row */}
            <View style={styles.rxRow}>
              <View style={styles.rxLabelCol}>
                <Text style={styles.rxRowLabel}>N</Text>
                <Text style={styles.rxRowSubLabel}>E A R</Text>
              </View>
              <TextInput
                style={styles.rxInput}
                value={data.rxReadingRight.sph}
                onChangeText={(val) => handleRxChange('rxReadingRight', 'sph', val)}
              />
              <TextInput
                style={styles.rxInput}
                value={data.rxReadingRight.cyl}
                onChangeText={(val) => handleRxChange('rxReadingRight', 'cyl', val)}
              />
              <TextInput
                style={styles.rxInput}
                value={data.rxReadingRight.axis}
                onChangeText={(val) => handleRxChange('rxReadingRight', 'axis', val)}
              />
              <TextInput
                style={styles.rxInput}
                value={data.rxReadingLeft.sph}
                onChangeText={(val) => handleRxChange('rxReadingLeft', 'sph', val)}
              />
              <TextInput
                style={styles.rxInput}
                value={data.rxReadingLeft.cyl}
                onChangeText={(val) => handleRxChange('rxReadingLeft', 'cyl', val)}
              />
              <TextInput
                style={styles.rxInput}
                value={data.rxReadingLeft.axis}
                onChangeText={(val) => handleRxChange('rxReadingLeft', 'axis', val)}
              />
            </View>
          </View>

          {/* Signature Box */}
          <View style={styles.signatureContainer}>
            <Text style={styles.signatureText}>हस्ताक्षर</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  padContainer: {
    padding: 10,
    backgroundColor: '#E6E6E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptBookPage: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    padding: 12,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subTitle: {
    fontSize: 10,
    color: '#000000',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '40%',
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    justifyContent: 'flex-end',
  },
  lbl: {
    fontSize: 11,
    color: '#000000',
    fontWeight: 'bold',
  },
  input: {
    fontSize: 12,
    color: '#000000',
    padding: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  noInput: {
    flex: 1,
    fontWeight: 'bold',
  },
  dateInput: {
    width: 90,
    textAlign: 'center',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fillInput: {
    flex: 1,
  },
  addressInput: {
    flex: 1,
  },
  mobileInput: {
    width: 100,
  },
  tableBorder: {
    borderWidth: 1,
    borderColor: '#000000',
    marginTop: 5,
    marginBottom: 10,
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  trHeader: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
    backgroundColor: '#F0F0F0',
  },
  trBody: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 32,
  },
  th: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
    paddingVertical: 5,
    paddingHorizontal: 2,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#000000',
  },
  td: {
    fontSize: 11,
    color: '#000000',
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRightWidth: 1,
    borderRightColor: '#000000',
    justifyContent: 'center',
  },
  tdInput: {
    fontSize: 11,
    color: '#000000',
    paddingVertical: 2,
    paddingHorizontal: 3,
    borderRightWidth: 1,
    borderRightColor: '#000000',
  },
  colNo: {
    width: '12%',
  },
  colParticulars: {
    flex: 1,
  },
  colQty: {
    width: '12%',
  },
  colRate: {
    width: '16%',
  },
  colAmount: {
    width: '20%',
    borderRightWidth: 0,
  },
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },
  totalsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 28,
  },
  totalsLabelCol: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#000000',
    justifyContent: 'center',
    paddingRight: 8,
  },
  totalsLbl: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'right',
  },
  totalsValCol: {
    width: '20%',
    justifyContent: 'center',
  },
  totalsInput: {
    fontSize: 11,
    color: '#000000',
    textAlign: 'right',
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  footerContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  rxContainer: {
    width: '70%',
    borderWidth: 1,
    borderColor: '#000000',
  },
  rxHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    backgroundColor: '#F5F5F5',
  },
  rxThEmpty: {
    width: '14%',
    borderRightWidth: 1,
    borderRightColor: '#000000',
  },
  rxThRight: {
    width: '43%',
    borderRightWidth: 1,
    borderRightColor: '#000000',
    alignItems: 'center',
  },
  rxThLeft: {
    width: '43%',
    alignItems: 'center',
  },
  rxHeaderTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000000',
    paddingVertical: 1,
  },
  rxSubHeaderRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#000000',
    width: '100%',
  },
  rxSubTh: {
    flex: 1,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    paddingVertical: 2,
    borderRightWidth: 0.5,
    borderRightColor: '#000000',
  },
  rxRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    minHeight: 28,
  },
  rxLabelCol: {
    width: '14%',
    borderRightWidth: 1,
    borderRightColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
  },
  rxRowLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000000',
    lineHeight: 10,
  },
  rxRowSubLabel: {
    fontSize: 5,
    color: '#333',
    lineHeight: 8,
  },
  rxInput: {
    flex: 1,
    fontSize: 9,
    color: '#000000',
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#000000',
    padding: 1,
  },
  signatureContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 5,
  },
  signatureText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
});
