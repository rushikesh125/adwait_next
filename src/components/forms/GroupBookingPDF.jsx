"use client";
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.6,
  },
  h1: {
    textAlign: 'center',
    marginBottom: 15,
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
    borderBottomColor: 'black',
    width: 120,
    marginLeft: 5,
  },

  // Name & Address block — inline label + underlines on same row then second line
  nameAddressBlock: { marginBottom: 12 },
  nameAddressRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 0 },
  inlineUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: 'black',
    flex: 1,
    marginLeft: 5,
    marginBottom: 1,
  },
  secondUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: 'black',
    width: '100%',
    marginTop: 13,
  },

  // Journey section
  journeyTitle: {
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    marginBottom: 8,
    textDecoration: 'underline',
  },
  journeyRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  journeyCell: {
    width: '50%',
    fontSize: 11,
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
      const baseMobile = group[0]?.mobile || "";

      const processedGroup = group.map((p) => {
        let finalChoice = p.preference || "None";
        if (finalChoice.toLowerCase() === 'lower') {
          lowerCount++;
          if (lowerCount > 2) finalChoice = "Middle";
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

      {/* ─── PAGE 1: Letter ─────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>GROUP BOOKING APPLICATION</Text>

        <Text style={{ marginBottom: 2 }}>To,</Text>
        <Text style={{ marginBottom: 2 }}>Station Master,</Text>

        {/* Railway Station with fill-in underline */}
        <View style={[styles.metaRow, { marginBottom: 10 }]}>
          <Text style={styles.fieldLabel}>Railway Station,</Text>
          <View style={styles.shortUnderline} />
        </View>

        {/* Subject – centered, not bold */}
        <Text style={styles.subject}>Subject: Permission for group booking.</Text>

        <Text style={{ marginBottom: 4 }}>Respected Sir,</Text>
        <Text style={styles.paragraph}>
          Request you to kindly grant permission for group booking of railway tickets.
        </Text>

        <Text style={{ marginBottom: 10 }}>Reason for Travel: TOURISM</Text>

        {/* Meta fields – each on its own line */}
        <View style={styles.metaSection}>

          {/* Place */}
          <View style={styles.metaRow}>
            <Text style={styles.fieldLabel}>Place :</Text>
            <View style={styles.shortUnderline} />
          </View>

          {/* Date */}
          <View style={styles.metaRow}>
            <Text style={styles.fieldLabel}>Date :</Text>
            <View style={styles.shortUnderline} />
          </View>

          {/* Signature */}
          <View style={styles.metaRow}>
            <Text style={styles.fieldLabel}>Signature :</Text>
            <View style={styles.shortUnderline} />
          </View>

          {/* Name & Address – label inline with first underline, second line below */}
          <View style={[styles.nameAddressBlock, { marginBottom: 12 }]}>
            <View style={styles.nameAddressRow}>
              <Text style={styles.fieldLabel}>Name & Address :</Text>
              <View style={styles.inlineUnderline} />
            </View>
            <View style={styles.secondUnderline} />
          </View>

          {/* Mobile Number */}
          <View style={styles.metaRow}>
            <Text style={styles.fieldLabel}>Mobile Number :</Text>
            <View style={styles.shortUnderline} />
          </View>

        </View>
      </Page>

      {/* ─── PAGE 2: Journey Details ────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        {trip?.journeys?.map((j, idx) => (
          <View key={idx} style={{ marginBottom: 12 }}>
            <Text style={styles.journeyTitle}>
              DETAILS OF {idx === 0 ? "OUTWARD" : "RETURN / ONWARD"} JOURNEY
            </Text>

            {/* Row 1: Train Number | Train Name */}
            <View style={styles.journeyRow}>
              <Text style={styles.journeyCell}>Train Number : {j.trainNo}</Text>
              <Text style={styles.journeyCell}>Train Name : {j.trainName}</Text>
            </View>

            {/* Row 2: Journey Date | Class */}
            <View style={styles.journeyRow}>
              <Text style={styles.journeyCell}>Journey Date : {j.date}</Text>
              <Text style={styles.journeyCell}>Class : {j.class || "2S"}</Text>
            </View>

            {/* Row 3: No of Seats */}
            <View style={styles.journeyRow}>
              <Text style={styles.journeyCell}>No. of Seats / Berths : {j.seats || ""}</Text>
              <Text style={styles.journeyCell}></Text>
            </View>

            {/* Row 4: Station From | Station To */}
            <View style={[styles.journeyRow, { marginBottom: 0 }]}>
              <Text style={styles.journeyCell}>Station From : {j.from}</Text>
              <Text style={styles.journeyCell}>Station To : {j.to}</Text>
            </View>
          </View>
        ))}
      </Page>

      {/* ─── PAGE 3: Passenger List ──────────────────────────────── */}
      <Page size="A4" style={styles.page}>
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
                    <View
                      key={pIdx}
                      style={{
                        flexDirection: 'row',
                        height: 28,
                      }}
                    >
                      {/* Sr */}
                      <Text style={[styles.tableCol, { width: '11.67%' }]}>
                        {gIdx * 6 + pIdx + 1}
                      </Text>
                      {/* Name */}
                      <Text style={[styles.tableCol, { width: '41.67%' }]}>
                        {p.name}
                      </Text>
                      {/* Gender */}
                      <Text style={[styles.tableCol, { width: '13.33%', textAlign: 'center' }]}>
                        {p.gender}
                      </Text>
                      {/* Age */}
                      <Text style={[styles.tableCol, { width: '11.67%', textAlign: 'center' }]}>
                        {p.age}
                      </Text>
                      {/* Berth — no right border so address col provides it */}
                     <Text style={[styles.tableCol, { width: '21.67%' }]}>
                        {p.allocatedChoice}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Merged Address Column — centered horizontally and vertically */}
                <View
                  style={[
                    styles.tableCol,
                    styles.colAddress,
                    {
                      minHeight: group.members.length * 28,
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 9, textAlign: 'center' }}>{group.address}</Text>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, marginTop: 4, textAlign: 'center' }}>
                    Mob: {group.mobile}
                  </Text>
                </View>
              </View>

              {/* Empty spacer row — full width merged, light bg */}
              <View style={[styles.tableRow, { height: 14, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderBottomColor: '#000' }]}>
                <View style={{ width: '100%' }} />
              </View>
            </React.Fragment>
          ))}
        </View>
      </Page>

    </Document>
  );
};