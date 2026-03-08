"use client";
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize:11,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  h1: {
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    textDecoration: 'underline',
  },
 subject: {
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    fontSize: 11,
  },
  paragraph: {
    marginBottom: 15,
    marginLeft: 30,
  },
  bold: { fontFamily: 'Helvetica-Bold' },

  // Meta fields
  metaSection: { marginTop: 15, marginBottom: 10 },
  metaRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  fieldLabel: { fontSize: 11 },
  shortUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: '#aaaaaa',
    width: 120,
    marginLeft: 5,
  },

  // Name & Address block
  nameAddressBlock: { marginBottom: 10 },
  nameAddressRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 0 },
  inlineUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: '#aaaaaa',
    flex: 1,
    marginLeft: 5,
    marginBottom: 1,
  },
  secondUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: '#aaaaaa',
    width: '100%',
    marginTop: 20,
  },

  // Journey section (compact)
  journeyTitle: {
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    marginBottom: 5,
    textDecoration: 'underline',
  },
  journeyRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  journeyCell: {
    width: '50%',
    fontSize: 9,
    paddingRight: 8,
  },

  // Table
  table: {
    display: 'table',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
  },
  tableRow: { flexDirection: 'row' },
  tableCol: {
    borderStyle: 'solid',
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    padding: 4,
    fontSize: 10,
  },
  tableHeader: {
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#eeeeee',
  },
  colSr:      { width: '7%' },
  colName:    { width: '25%' },
  colGender:  { width: '8%' },
  colAge:     { width: '7%' },
  colChoice:  { width: '13%' },
  colAddress: { width: '40%' },
});

export const GroupBookingPDF = ({ trip, responses }) => {
  const processGroups = () => {
    const groups = [];
    for (let i = 0; i < responses.length; i += 6) {
      const group = responses.slice(i, i + 6);
      let lowerCount = 0;
      const baseAddress = group[0]?.address || "";
      const baseMobile  = group[0]?.mobile  || "";

      const processedGroup = group.map((p) => {
        let finalChoice = p.preference || "None";
        if (finalChoice.toLowerCase() === 'lower') {
          lowerCount++;
          if (lowerCount > 2) finalChoice = "upper";
        }
        return { ...p, allocatedChoice: finalChoice };
      });
      groups.push({ members: processedGroup, address: baseAddress, mobile: baseMobile });
    }
    return groups;
  };

  const groupedData = processGroups();
  const ROW_HEIGHT    = 28;
  const SPACER_HEIGHT = 14;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ─── SECTION 1: Letter ─────────────────────────────────────── */}
        <Text style={styles.h1}>GROUP BOOKING APPLICATION</Text>

        <Text style={{ marginBottom: 2, }}>To,</Text>
        <Text style={{ marginBottom: 2, }}>Station Master,</Text>

        <View style={[styles.metaRow, { marginBottom: 6 }]}>
          <Text style={styles.fieldLabel}>Railway Station,</Text>
          <View style={styles.shortUnderline} />
        </View>

        <Text style={styles.subject}>Subject: Permission for group booking.</Text>

        <Text style={{ marginBottom: 4 }}>Respected Sir,</Text>
        <Text style={styles.paragraph}>
          Request you to kindly grant permission for group booking of railway tickets.
        </Text>

        {/* No marginBottom — metaSection's marginTop provides the gap */}
        <Text >Reason for Travel: TOURISM</Text>

        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Text style={styles.fieldLabel}>Place :</Text>
            <View style={styles.shortUnderline} />
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.fieldLabel}>Date :</Text>
            <View style={styles.shortUnderline} />
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.fieldLabel}>Signature :</Text>
            <View style={styles.shortUnderline} />
          </View>

          <View style={[styles.nameAddressBlock, { marginBottom: 10 }]}>
            <View style={styles.nameAddressRow}>
              <Text style={styles.fieldLabel}>Name & Address :</Text>
              <View style={styles.inlineUnderline} />
            </View>
            <View style={styles.secondUnderline} />
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.fieldLabel}>Mobile Number :</Text>
            <View style={styles.shortUnderline} />
          </View>
        </View>

        {/* ─── SECTION 2: Journey Details (compact 3-line layout) ─────── */}
        <View style={{ marginTop: 12 }}>
          {trip?.journeys?.map((j, idx) => (
            <View key={idx} style={{ marginBottom: 10 }}>

              <Text style={styles.journeyTitle}>
                DETAILS OF {idx === 0 ? "OUTWARD" : "RETURN / ONWARD"} JOURNEY
              </Text>

              {/* Line 1: Train Number | Train Name */}
              <View style={styles.journeyRow}>
                <Text style={styles.journeyCell}>Train Number : {j.trainNo}</Text>
                <Text style={styles.journeyCell}>Train Name : {j.trainName}</Text>
              </View>

              {/* Line 2: Journey Date | Class */}
              <View style={styles.journeyRow}>
                <Text style={styles.journeyCell}>Journey Date : {j.date}</Text>
                <Text style={styles.journeyCell}>Class : {j.class || "2S"}</Text>
              </View>

              {/* Line 3: Station From | Station To + Seats */}
              <View style={styles.journeyRow}>
                <Text style={styles.journeyCell}>Station From : {j.from}</Text>
                <Text style={styles.journeyCell}>
                  Station To : {j.to}{"   "}Seats : {j.seats || ""}
                </Text>
              </View>

            </View>
          ))}
        </View>

        {/* ─── SECTION 3: Passenger List ──────────────────────────────── */}
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.h1, { fontSize: 14, marginBottom: 12 }]}>PASSENGER LIST</Text>

          <View style={styles.table}>
            {/* Header */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, styles.colSr,      styles.tableHeader]}>Sr.</Text>
              <Text style={[styles.tableCol, styles.colName,    styles.tableHeader]}>Name</Text>
              <Text style={[styles.tableCol, styles.colGender,  styles.tableHeader]}>Gender</Text>
              <Text style={[styles.tableCol, styles.colAge,     styles.tableHeader]}>Age</Text>
              <Text style={[styles.tableCol, styles.colChoice,  styles.tableHeader]}>Berth</Text>
              <Text style={[styles.tableCol, styles.colAddress, styles.tableHeader]}>Address & Mobile</Text>
            </View>

            {groupedData.map((group, gIdx) => (
              <React.Fragment key={gIdx}>
                <View style={styles.tableRow}>
                  {/* Left 5 columns stacked per member */}
                  <View style={{ width: '60%' }}>
                    {group.members.map((p, pIdx) => (
                      <View key={pIdx} style={{ flexDirection: 'row', height: ROW_HEIGHT }}>
                        <Text style={[styles.tableCol, { width: '11.67%' }]}>
                          {gIdx * 6 + pIdx + 1}
                        </Text>
                        <Text style={[styles.tableCol, { width: '41.67%' }]}>{p.name}</Text>
                        <Text style={[styles.tableCol, { width: '13.33%', textAlign: 'center' }]}>{p.gender}</Text>
                        <Text style={[styles.tableCol, { width: '11.67%', textAlign: 'center' }]}>{p.age}</Text>
                        <Text style={[styles.tableCol, { width: '21.67%' }]}>{p.allocatedChoice}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Address column */}
                  <View
                    style={{
                      width: '40%',
                      borderStyle: 'solid',
                      borderRightWidth: 1,
                      borderRightColor: '#000',
                      borderBottomWidth: 1,
                      borderBottomColor: '#000',
                      borderLeftWidth: 1,
                      padding: 4,
                      fontSize: 10,
                      minHeight: group.members.length * ROW_HEIGHT,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 9, textAlign: 'center' }}>{group.address}</Text>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, marginTop: 4, textAlign: 'center' }}>
                      Mob: {group.mobile}
                    </Text>
                  </View>
                </View>

                {/* Spacer row */}
                <View style={[styles.tableRow, { height: SPACER_HEIGHT, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderBottomColor: '#000' }]}>
                  <View style={{ width: '100%' }} />
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

      </Page>
    </Document>
  );
};