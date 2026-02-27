"use client";
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', lineHeight: 1.4 },
  header: { textAlign: 'center', marginBottom: 10, fontWeight: 'bold', fontSize: 12, textDecoration: 'underline' },
  section: { marginBottom: 8 },
  bold: { fontWeight: 'bold' },
  table: { display: 'table', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderRightWidth: 0, borderBottomWidth: 0 },
  tableRow: { flexDirection: 'row' },
  tableCol: { borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, padding: 4 },
  // Column Widths
  colSr: { width: '8%' },
  colName: { width: '27%' },
  colAge: { width: '8%' },
  colChoice: { width: '15%' },
  colAddress: { width: '42%' },
});

export const GroupBookingPDF = ({ trip, responses }) => {
  // Logic to process groups and enforce seat/address rules
  const processGroups = () => {
    const groups = [];
    for (let i = 0; i < responses.length; i += 6) {
      let group = responses.slice(i, i + 6);
      let lowerCount = 0;
      
      // Address from the 1st person of the group
      const baseAddress = group[0]?.address || "";
      const baseMobile = group[0]?.mobile || "";

      const processedGroup = group.map((p) => {
        let finalChoice = p.preference || "None";
        // Rule: Max 2 lower berths per group of 6
        if (finalChoice.toLowerCase() === 'lower') {
          lowerCount++;
          if (lowerCount > 2) finalChoice = "Middle"; // Re-allocate 3rd lower
        }
        return { ...p, allocatedChoice: finalChoice };
      });

      groups.push({ members: processedGroup, address: baseAddress, mobile: baseMobile });
    }
    return groups;
  };

  const groupedData = processGroups();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Hardcoded Header Section [cite: 1-6] */}
        <Text style={styles.header}>GROUP BOOKING APPLICATION</Text>
        <Text>To,</Text>
        <Text>Station Master,</Text>
        <Text style={styles.section}>Railway Station,</Text>
        <Text style={[styles.section, styles.bold]}>Subject: Permission for group booking.</Text>
        <Text>Respected Sir,</Text>
        <Text style={styles.section}>Request you to kindly grant permission for group booking of railway tickets.</Text>
        <Text style={styles.section}>Reason for Travel: TOURISM [cite: 7]</Text>

        {/* Dynamic Journey Details [cite: 13-41] */}
        {trip?.journeys?.map((j, idx) => (
          <View key={idx} style={{ marginBottom: 10, borderBottom: 1, paddingBottom: 5 }}>
            <Text style={styles.bold}>DETAILS OF {idx === 0 ? "OUTWARD" : "RETURN/ONWARD"} JOURNEY</Text>
            <View style={styles.tableRow}>
              <Text style={{ width: '50%' }}>Train Name: {j.trainName}</Text>
              <Text style={{ width: '50%' }}>Train Number: {j.trainNo}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={{ width: '33%' }}>Date: {j.date}</Text>
              <Text style={{ width: '33%' }}>From: {j.from}</Text>
              <Text style={{ width: '33%' }}>To: {j.to}</Text>
            </View>
          </View>
        ))}

        {/* Passenger Table  */}
        <View style={styles.table}>
          <View style={[styles.tableRow, { backgroundColor: '#eeeeee' }]}>
            <Text style={[styles.tableCol, styles.colSr, styles.bold]}>Sr.No</Text>
            <Text style={[styles.tableCol, styles.colName, styles.bold]}>Name/Gender</Text>
            <Text style={[styles.tableCol, styles.colAge, styles.bold]}>Age</Text>
            <Text style={[styles.tableCol, styles.colChoice, styles.bold]}>Choice</Text>
            <Text style={[styles.tableCol, styles.colAddress, styles.bold]}>Address & Mobile</Text>
          </View>

          {groupedData.map((group, gIdx) => (
            <React.Fragment key={gIdx}>
              {group.members.map((p, pIdx) => (
                <View style={styles.tableRow} key={pIdx}>
                  <Text style={[styles.tableCol, styles.colSr]}>{gIdx * 6 + pIdx + 1}</Text>
                  <Text style={[styles.tableCol, styles.colName]}>{p.name} / {p.gender?.[0]}</Text>
                  <Text style={[styles.tableCol, styles.colAge]}>{p.age}</Text>
                  <Text style={[styles.tableCol, styles.colChoice]}>{p.allocatedChoice}</Text>
                  
                  {/* Row Merging: Address only on the first row of the group  */}
                  {pIdx === 0 ? (
                    <View style={[styles.tableCol, styles.colAddress]}>
                      <Text style={{ fontSize: 8 }}>{group.address}</Text>
                      <Text style={styles.bold}>Mob: {group.mobile}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.tableCol, styles.colAddress]}></Text>
                  )}
                </View>
              ))}
              {/* Empty row for spacing between groups */}
              <View style={[styles.tableRow, { height: 10 }]}><Text style={{ width: '100%' }}></Text></View>
            </React.Fragment>
          ))}
        </View>
      </Page>
    </Document>
  );
};