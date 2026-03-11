import { StyleSheet } from "@react-pdf/renderer";

export const colors = {
  black: "#111111",
  darkGray: "#333333",
  gray: "#555555",
  mediumGray: "#888888",
  lightGray: "#aaaaaa",
  borderGray: "#e0e0e0",
  bgLight: "#f8fafc",
  bgLighter: "#fafafa",
  white: "#ffffff",
  critical: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" },
  warning: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" },
  info: { bg: "#f0f9ff", border: "#0284c7", text: "#0c4a6e" },
  legal: { bg: "#fffbeb", border: "#fbbf24", text: "#78350f" },
  status: {
    draft: "#d97706",
    final: "#059669",
    archived: "#6b7280",
  },
};

export const styles = StyleSheet.create({
  page: {
    paddingTop: 60,
    paddingBottom: 70,
    paddingHorizontal: 50,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.darkGray,
    lineHeight: 1.6,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 10,
    borderBottomWidth: 2.5,
    borderBottomColor: colors.black,
    marginBottom: 4,
  },
  brandName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: colors.black,
  },
  brandTagline: {
    fontSize: 7,
    color: colors.mediumGray,
    letterSpacing: 1,
    marginTop: 2,
  },
  refBlock: {
    textAlign: "right",
  },
  refId: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.black,
  },
  refDate: {
    fontSize: 7.5,
    color: colors.mediumGray,
    marginTop: 2,
  },

  // Confidential banner
  confBanner: {
    backgroundColor: colors.black,
    color: colors.white,
    textAlign: "center",
    paddingVertical: 4,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 16,
  },

  // Title block
  titleBlock: {
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
    lineHeight: 1.3,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    paddingBottom: 10,
    borderBottomWidth: 0.75,
    borderBottomColor: colors.borderGray,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.gray,
  },
  metaValue: {
    fontSize: 8,
    color: colors.darkGray,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.white,
  },

  // Info grid
  infoGrid: {
    flexDirection: "row",
    borderWidth: 0.75,
    borderColor: colors.borderGray,
    marginVertical: 14,
  },
  infoCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRightWidth: 0.75,
    borderRightColor: colors.borderGray,
  },
  infoCellLast: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cellLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.lightGray,
    marginBottom: 3,
  },
  cellValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.black,
  },
  sectionNum: {
    backgroundColor: colors.black,
    color: colors.white,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    width: 20,
    height: 20,
    textAlign: "center",
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: colors.black,
  },
  sectionBody: {
    paddingLeft: 28,
  },
  sectionText: {
    fontSize: 10,
    lineHeight: 1.65,
    color: colors.darkGray,
    textAlign: "justify",
  },

  // Key points
  pointItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 4,
    borderLeftWidth: 3,
  },
  pointIcon: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    width: 16,
    marginTop: 1,
  },
  pointText: {
    fontSize: 9.5,
    lineHeight: 1.5,
    flex: 1,
  },

  // Action items
  actionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 3,
    backgroundColor: colors.info.bg,
    borderLeftWidth: 3,
    borderLeftColor: colors.info.border,
  },
  actionItemUrgent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 3,
    backgroundColor: colors.critical.bg,
    borderLeftWidth: 3,
    borderLeftColor: colors.critical.border,
  },
  actionCheck: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderColor: colors.info.border,
    marginTop: 2,
  },
  actionCheckUrgent: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderColor: colors.critical.border,
    marginTop: 2,
  },
  actionText: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: colors.info.text,
    flex: 1,
  },
  actionTextUrgent: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: colors.critical.text,
    fontFamily: "Helvetica-Bold",
    flex: 1,
  },

  // Legal notes
  legalBox: {
    backgroundColor: colors.legal.bg,
    borderWidth: 0.75,
    borderColor: colors.legal.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  legalText: {
    fontSize: 9.5,
    color: colors.legal.text,
    lineHeight: 1.6,
  },

  // Transcription
  transcriptionBox: {
    backgroundColor: colors.bgLighter,
    borderWidth: 0.75,
    borderColor: colors.borderGray,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 9,
    lineHeight: 1.75,
    color: colors.gray,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 0.75,
    borderTopColor: colors.borderGray,
  },
  footerText: {
    fontSize: 6.5,
    color: colors.lightGray,
  },
  footerBrand: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.lightGray,
  },
  pageNumber: {
    fontSize: 6.5,
    color: colors.lightGray,
  },

  // Watermark
  watermark: {
    position: "absolute",
    top: "45%",
    left: "15%",
    fontSize: 60,
    color: "#f0f0f0",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    transform: "rotate(-35deg)",
    opacity: 0.15,
  },
});
