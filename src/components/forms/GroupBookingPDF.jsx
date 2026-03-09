"use client";
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.3,
  },
  h1: {
    textAlign: "center",
    marginBottom: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    textDecoration: "underline",
  },
  subject: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
    fontSize: 10,
  },
  paragraph: {
    marginBottom: 12,
    marginLeft: 24,
  },
  bold: { fontFamily: "Helvetica-Bold" },

  // Meta fields
  metaSection: { marginTop: 10, marginBottom: 8 },
  metaRow: { flexDirection: "row", marginBottom: 10, alignItems: "flex-end" },
  fieldLabel: { fontSize: 10 },
  shortUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: "#aaaaaa",
    width: 120,
    marginLeft: 5,
  },

  // Name & Address block
  nameAddressBlock: { marginBottom: 8 },
  nameAddressRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 0,
  },
  inlineUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: "#aaaaaa",
    flex: 1,
    marginLeft: 5,
    marginBottom: 1,
  },
  secondUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: "#aaaaaa",
    width: "100%",
    marginTop: 16,
  },

  // Journey section (compact)
  journeyTitle: {
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 4,
    textDecoration: "underline",
  },
  journeyRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  journeyCell: {
    width: "50%",
    fontSize: 9,
    paddingRight: 6,
  },

  // Passenger list page — tighter padding to fit 30 rows at font 11
  listPage: {
    padding: 20,
    fontSize: 11,
    fontFamily: "Helvetica",
    lineHeight: 1.2,
  },
  listPageTitle: {
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    textDecoration: "underline",
    marginBottom: 6,
  },

  // Table
  table: {
    display: "table",
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
  },
  tableRow: { flexDirection: "row" },
  tableCol: {
    borderStyle: "solid",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    padding: 2,           // tighter padding vs original 3
    fontSize: 11,
  },
  tableHeader: {
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#dddddd",
    fontSize: 11,
  },
  colSr:     { width: "6%" },
  colName:   { width: "24%" },
  colGender: { width: "8%" },
  colAge:    { width: "6%" },
  colChoice: { width: "12%" },
  colAddress:{ width: "44%" },
});

const ROW_HEIGHT   = 22;  // tight enough for 30 rows at font 11 on A4
const SPACER_HEIGHT = 4;  // reduced from 10 to save vertical space

// ── Helper: split groupedData into pages of max 30 passengers ──
function paginateGroups(groupedData, maxPassengersPerPage = 30) {
  const pages = [];
  let currentPage = [];
  let currentCount = 0;

  for (const group of groupedData) {
    const size = group.members.length;
    if (currentCount + size > maxPassengersPerPage && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentCount = 0;
    }
    currentPage.push(group);
    currentCount += size;
  }
  if (currentPage.length > 0) pages.push(currentPage);
  return pages;
}

// ── Table header row ──
const TableHeader = () => (
  <View style={styles.tableRow}>
    <Text style={[styles.tableCol, styles.colSr,     styles.tableHeader]}>Sr.</Text>
    <Text style={[styles.tableCol, styles.colName,   styles.tableHeader]}>Name</Text>
    <Text style={[styles.tableCol, styles.colGender, styles.tableHeader]}>Gender</Text>
    <Text style={[styles.tableCol, styles.colAge,    styles.tableHeader]}>Age</Text>
    <Text style={[styles.tableCol, styles.colChoice, styles.tableHeader]}>Berth</Text>
    <Text style={[styles.tableCol, styles.colAddress,styles.tableHeader]}>Address & Mobile</Text>
  </View>
);

// ── Single group block inside the table ──
const GroupBlock = ({ group, globalStartIdx }) => (
  <React.Fragment>
    <View style={styles.tableRow}>
      {/* Left 5 columns */}
      <View style={{ width: "56%" }}>
        {group.members.map((p, pIdx) => (
          <View key={pIdx} style={{ flexDirection: "row", height: ROW_HEIGHT }}>
            <Text style={[styles.tableCol, { width: "10.71%" }]}>
              {globalStartIdx + pIdx + 1}
            </Text>
            <Text style={[styles.tableCol, { width: "42.86%" }]}>
              {p.name}
            </Text>
            <Text style={[styles.tableCol, { width: "14.29%", textAlign: "center" }]}>
              {p.gender}
            </Text>
            <Text style={[styles.tableCol, { width: "10.71%", textAlign: "center" }]}>
              {p.age}
            </Text>
            <Text style={[styles.tableCol, { width: "21.43%" }]}>
              {p.allocatedChoice}
            </Text>
          </View>
        ))}
      </View>

      {/* Address column spanning all member rows */}
      <View
        style={{
          width: "44%",
          borderStyle: "solid",
          borderRightWidth: 1,
          borderRightColor: "#000",
          borderBottomWidth: 1,
          borderBottomColor: "#000",
          borderLeftWidth: 1,
          padding: 4,
          fontSize: 11,
          minHeight: group.members.length * ROW_HEIGHT,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 11, textAlign: "center" }}>
          {group.address}
        </Text>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 2, textAlign: "center" }}>
          Mob: {group.mobile}
        </Text>
      </View>
    </View>

    {/* Spacer between groups */}
    <View
      style={[
        styles.tableRow,
        {
          height: SPACER_HEIGHT,
          backgroundColor: "#f0f0f0",
          borderBottomWidth: 1,
          borderBottomColor: "#000",
        },
      ]}
    >
      <View style={{ width: "100%" }} />
    </View>
  </React.Fragment>
);

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
        if (finalChoice.toLowerCase() === "lower") {
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
  const pages       = paginateGroups(groupedData, 30); // 30 passengers per page

  // Compute global passenger start index per page
  const pageStartIndices = pages.reduce((acc, page, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + pages[i - 1].reduce((s, g) => s + g.members.length, 0));
    return acc;
  }, []);

  return (
    <Document>
      {/* ══════════════════════════════════════════════════════
          PAGE 1 — Letter + Journey Details
          ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>GROUP BOOKING APPLICATION</Text>

        <Text style={{ marginBottom: 2 }}>To,</Text>
        <Text style={{ marginBottom: 2 }}>Station Master,</Text>

        <View style={[styles.metaRow, { marginBottom: 6 }]}>
          <Text style={styles.fieldLabel}>Railway Station,</Text>
          <View style={styles.shortUnderline} />
        </View>

        <Text style={styles.subject}>Subject: Permission for group booking.</Text>

        <Text style={{ marginBottom: 4 }}>Respected Sir,</Text>
        <Text style={styles.paragraph}>
          Request you to kindly grant permission for group booking of railway tickets.
        </Text>

        <Text>Reason for Travel: TOURISM</Text>

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

          <View style={[styles.nameAddressBlock, { marginBottom: 8 }]}>
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

        {/* Journey Details */}
        <View style={{ marginTop: 10 }}>
          {trip?.journeys?.map((j, idx) => (
            <View key={idx} style={{ marginBottom: 8 }}>
              <Text style={styles.journeyTitle}>
                DETAILS OF {idx === 0 ? "OUTWARD" : "RETURN / ONWARD"} JOURNEY
              </Text>
              <View style={styles.journeyRow}>
                <Text style={styles.journeyCell}>Train Number : {j.trainNo}</Text>
                <Text style={styles.journeyCell}>Train Name : {j.trainName}</Text>
              </View>
              <View style={styles.journeyRow}>
                <Text style={styles.journeyCell}>
                  Journey Date : {new Date(j.date).toLocaleDateString("en-GB")}
                </Text>
                <Text style={styles.journeyCell}>Class : {j.class || "2S"}</Text>
              </View>
              <View style={styles.journeyRow}>
                <Text style={styles.journeyCell}>Station From : {(j.from || "").toUpperCase()}</Text>
                <Text style={styles.journeyCell}>
                   Station To : {(j.to || "").toUpperCase()}{"   "}Seats : {j.seats || ""}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════
          PAGE 2+ — Passenger List (max 30 per page)
          ══════════════════════════════════════════════════════ */}
      {pages.map((pageGroups, pageIdx) => {
        let runningIdx = pageStartIndices[pageIdx];
        return (
          <Page key={pageIdx} size="A4" style={styles.listPage}>
            <Text style={styles.listPageTitle}>PASSENGER LIST</Text>

            <View style={styles.table}>
              <TableHeader />

              {pageGroups.map((group, gIdx) => {
                const startIdx = runningIdx;
                runningIdx += group.members.length;
                return (
                  <GroupBlock
                    key={gIdx}
                    group={group}
                    globalStartIdx={startIdx}
                  />
                );
              })}
            </View>

            {/* Page number */}
            <Text
              style={{
                textAlign: "right",
                fontSize: 8,
                marginTop: 4,
                color: "#666",
              }}
            >
              Page {pageIdx + 2}
            </Text>
          </Page>
        );
      })}
    </Document>
  );
};