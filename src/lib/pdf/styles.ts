import { StyleSheet } from "@react-pdf/renderer";

export const colors = {
  black: "#1a1a1a",
  darkGray: "#2d2d2d",
  gray: "#4a4a4a",
  mediumGray: "#777777",
  lightGray: "#a0a0a0",
  borderGray: "#d4d4d4",
  borderLight: "#e8e8e8",
  bgLight: "#f7f7f7",
  bgLighter: "#fafafa",
  white: "#ffffff",
  accent: "#2c5282",
  accentLight: "#ebf2fa",
  status: {
    draft: "#8b6914",
    final: "#1a6b41",
    archived: "#6b7280",
  },
};

export const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 65,
    paddingHorizontal: 52,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: colors.darkGray,
    lineHeight: 1.55,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.black,
    marginBottom: 4,
  },
  brandName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: colors.black,
  },
  brandTagline: {
    fontSize: 7,
    color: colors.mediumGray,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  refBlock: {
    textAlign: "right",
  },
  refId: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.gray,
  },
  refDate: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 2,
  },

  // Confidential banner
  confBanner: {
    backgroundColor: colors.bgLight,
    color: colors.mediumGray,
    textAlign: "center",
    paddingVertical: 3,
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 14,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderTopColor: colors.borderGray,
    borderBottomColor: colors.borderGray,
  },

  // Title block
  titleBlock: {
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
    lineHeight: 1.3,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    color: colors.mediumGray,
  },
  metaValue: {
    fontSize: 7.5,
    color: colors.darkGray,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.white,
  },

  // Info grid
  infoGrid: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderColor: colors.borderGray,
    marginVertical: 12,
  },
  infoCell: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRightWidth: 0.5,
    borderRightColor: colors.borderGray,
  },
  infoCellLast: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  cellLabel: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.lightGray,
    marginBottom: 2,
  },
  cellValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
  },

  // Section
  section: {
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 7,
    paddingBottom: 4,
    borderBottomWidth: 0.75,
    borderBottomColor: colors.borderGray,
  },
  sectionNum: {
    backgroundColor: colors.black,
    color: colors.white,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    width: 17,
    height: 17,
    textAlign: "center",
    paddingTop: 3.5,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.black,
  },
  sectionBody: {
    paddingLeft: 24,
  },
  sectionText: {
    fontSize: 9.5,
    lineHeight: 1.6,
    color: colors.darkGray,
    textAlign: "justify",
  },

  // Key points
  pointItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 3,
    borderLeftWidth: 2,
    borderLeftColor: colors.borderGray,
    backgroundColor: colors.bgLighter,
  },
  pointIcon: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    width: 14,
    marginTop: 1,
    color: colors.gray,
  },
  pointText: {
    fontSize: 9,
    lineHeight: 1.45,
    flex: 1,
    color: colors.darkGray,
  },

  // Action items
  actionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 3,
    borderLeftWidth: 2,
    borderLeftColor: colors.borderGray,
  },
  actionItemUrgent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 3,
    borderLeftWidth: 2,
    borderLeftColor: "#b91c1c",
    backgroundColor: "#fef7f7",
  },
  actionCheck: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: colors.borderGray,
    marginTop: 2,
  },
  actionCheckUrgent: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: "#b91c1c",
    marginTop: 2,
  },
  actionText: {
    fontSize: 9,
    lineHeight: 1.45,
    color: colors.darkGray,
    flex: 1,
  },
  actionTextUrgent: {
    fontSize: 9,
    lineHeight: 1.45,
    color: "#7f1d1d",
    fontFamily: "Helvetica-Bold",
    flex: 1,
  },

  // Legal notes
  legalBox: {
    backgroundColor: colors.accentLight,
    borderWidth: 0.5,
    borderColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 3,
  },
  legalText: {
    fontSize: 9,
    color: colors.accent,
    lineHeight: 1.55,
  },

  // Transcription
  transcriptionBox: {
    backgroundColor: colors.bgLighter,
    borderWidth: 0.5,
    borderColor: colors.borderGray,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 8.5,
    lineHeight: 1.65,
    color: colors.gray,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 28,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 5,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderLight,
  },
  footerText: {
    fontSize: 6,
    color: colors.lightGray,
  },
  footerBrand: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.lightGray,
  },
  pageNumber: {
    fontSize: 6,
    color: colors.lightGray,
  },

  // Watermark
  watermark: {
    position: "absolute",
    top: "45%",
    left: "15%",
    fontSize: 55,
    color: "#eeeeee",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    transform: "rotate(-35deg)",
    opacity: 0.12,
  },
});
