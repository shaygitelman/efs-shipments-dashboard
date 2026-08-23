// Execution paths — the "how" layer sitting on top of getExceptions()'s
// "what"/"why". Every exception type is mapped here to a concrete answer to
// "where and how does Sarit actually do this from EFS", so "פעולה נדרשת"
// never leaves her guessing. Each option is either:
//   - a real, working action in this demo (available: true) — opens the
//     Communication Agent's composer, or jumps to the in-page section that
//     already holds the relevant data (source comparison, payment details,
//     the Monday task), or
//   - explicitly marked unavailable (available: false) with a note
//     explaining what it stands in for and where it would really happen —
//     never a button that quietly does nothing.
import { Shipment, RecommendedAction } from "./types";
import { getExceptions } from "./rules";
import { getRecommendedAction } from "./communication-agent";

export interface ExecutionOption {
  label: string;
  available: boolean;
  // Present regardless of availability: for available scroll-to actions it
  // clarifies this is a simplified stand-in for a real integration; for
  // unavailable ones it explains what would need to happen instead.
  note?: string;
  emailAction?: RecommendedAction; // opens the Communication Agent composer
  scrollToId?: string; // in-page section already showing the relevant data
}

export interface ExecutionPath {
  primary: ExecutionOption;
  secondary?: ExecutionOption;
}

// DOM anchors for the in-page sections an execution option can jump to —
// kept in one place so the id used here and the id rendered by the target
// component can never drift apart.
export const EXECUTION_ANCHORS = {
  sources: "shipment-sources",
  payment: "shipment-payment",
  tasks: "shipment-tasks",
} as const;

export function getExecutionPath(shipment: Shipment): ExecutionPath | null {
  const top = getExceptions(shipment)[0];
  if (!top) return null;

  const emailAction = getRecommendedAction(shipment) ?? undefined;

  switch (top.type) {
    case "delayed":
    case "missing-eta":
      return {
        primary: { label: "יצירת פנייה לחברת הספנות", available: true, emailAction },
        secondary: {
          label: "פתיחת מקור המעקב",
          available: false,
          note: "אין חיבור אמיתי לפורטל המעקב של חברת הספנות בדמו זה — בפרודקשן זו תיפתח את דף המעקב הרשמי של החברה.",
        },
      };

    case "missing-container":
      return {
        primary: { label: "בקשת מספר מכולה מהספק / משלח", available: true, emailAction },
      };

    case "waiting-for-response":
      return {
        primary: { label: "שליחת Follow-up", available: true, emailAction },
      };

    case "conflicting-info":
      return {
        primary: {
          label: "בדיקת המקורות",
          available: true,
          scrollToId: EXECUTION_ANCHORS.sources,
          note: "מציג את שני הערכים הסותרים ואת המקור של כל אחד מהם.",
        },
        secondary: { label: "יצירת פנייה למשלח", available: true, emailAction },
      };

    case "payment-overdue":
      return {
        primary: {
          label: "צפייה בפרטי התשלום",
          available: true,
          scrollToId: EXECUTION_ANCHORS.payment,
        },
        secondary: {
          label: "בדיקת סטטוס מול הנהלת חשבונות",
          available: false,
          note: "בירור ועדכון תשלום מתבצעים במערכת הכספים (Priority) — אין פעולה ישירה מתוך EFS בדמו זה.",
        },
      };

    case "task-overdue":
      return {
        primary: {
          label: "פתיחת משימת Monday",
          available: true,
          scrollToId: EXECUTION_ANCHORS.tasks,
          note: "בדמו זה מציג את פרטי המשימה בתוך EFS — בפרודקשן זו תקשר ישירות ל-Monday או תסתנכרן דרך ה-API שלה.",
        },
      };

    case "ai-needs-review":
      return {
        primary: {
          label: "בירור מול הגורם הרלוונטי",
          available: false,
          note: "האירוע אושר ע\"י המשתמש אך דורש בירור חיצוני ידני (למשל מול המשלח או עמיל המכס) — אינו ניתן לביצוע אוטומטי מתוך EFS.",
        },
      };

    case "arriving-soon":
      return {
        primary: {
          label: "הכנה לקבלת משלוח",
          available: false,
          note: "פעולה פנימית מול צוות המחסן/המכס — אינה מתבצעת דרך EFS בדמו זה.",
        },
      };
  }
}
