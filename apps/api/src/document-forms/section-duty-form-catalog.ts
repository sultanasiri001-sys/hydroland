import type { DocumentFieldDefinition, DocumentTemplate, DocumentDepartment } from './document-form.domain';

// Reviewed content additions requested by the platform owner. Existing keys and
// types are retained. Publishing these definitions never executes a domain action.
export const SECTION_DUTY_SOURCE = 'HYDROLAND_Department_Structures_and_Duties_AR_2026-11-02';
export const SECTION_FORM_IDENTITY = 'HYDROLAND_INCIDENT_IDENTITY_V2';
export const SECTION_FORM_EXTENSIONS: Record<string, DocumentFieldDefinition[]> = {
  "HR-EMPLOYEE-REPORT": [
    {
      "key": "departmentName",
      "labelAr": "الإدارة",
      "labelEn": "Department",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "sectionName",
      "labelAr": "القسم",
      "labelEn": "Section",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "positionName",
      "labelAr": "الوظيفة",
      "labelEn": "Position",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "employmentEffectiveDate",
      "labelAr": "تاريخ سريان الوضع الوظيفي",
      "labelEn": "Employment effective date",
      "type": "DATE",
      "required": true
    },
    {
      "key": "contractVersionRef",
      "labelAr": "مرجع العقد وإصداره",
      "labelEn": "Contract version reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "appointmentDecisionRef",
      "labelAr": "مرجع قرار التعيين",
      "labelEn": "Appointment decision reference",
      "type": "TEXT",
      "required": false
    },
    {
      "key": "fileReviewOutcome",
      "labelAr": "نتيجة مراجعة الملف ونواقصه",
      "labelEn": "File review outcome",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "HR-LEAVE-REQUEST": [
    {
      "key": "requestedDays",
      "labelAr": "مدة الإجازة بالأيام",
      "labelEn": "Requested days",
      "type": "NUMBER",
      "required": true
    },
    {
      "key": "balanceSnapshotRef",
      "labelAr": "مرجع الرصيد وقت الطلب",
      "labelEn": "Balance snapshot reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "availableBalanceDays",
      "labelAr": "الرصيد المسجل بالأيام",
      "labelEn": "Recorded balance days",
      "type": "NUMBER",
      "required": true
    },
    {
      "key": "coveragePlan",
      "labelAr": "خطة البديل وتسليم المهام",
      "labelEn": "Coverage and handover plan",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "leaveDecisionRef",
      "labelAr": "مرجع قرار الإجازة أو حالة انتظاره",
      "labelEn": "Leave decision or pending reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "HR-PERFORMANCE-REVIEW": [
    {
      "key": "objectivesEvidence",
      "labelAr": "الأهداف والأوزان والنتائج وأدلتها",
      "labelEn": "Objectives weights results and evidence",
      "type": "TABLE",
      "required": true,
      "options": [
        "الهدف",
        "الوزن",
        "النتيجة",
        "مرجع الدليل"
      ]
    },
    {
      "key": "evaluatorRef",
      "labelAr": "مرجع المقيّم وصفته",
      "labelEn": "Evaluator reference and role",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "employeeComments",
      "labelAr": "ملاحظات الموظف وردّه",
      "labelEn": "Employee comments",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "developmentPlanRef",
      "labelAr": "مرجع خطة التحسين والتطوير",
      "labelEn": "Development plan reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "reviewDecisionRef",
      "labelAr": "مرجع مراجعة النتيجة",
      "labelEn": "Review decision reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "HR-COMPENSATION-MEMO": [
    {
      "key": "entitlementPeriod",
      "labelAr": "فترة الاستحقاق",
      "labelEn": "Entitlement period",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "variableSourceRefs",
      "labelAr": "مراجع متغيرات الاستحقاق والحسميات",
      "labelEn": "Entitlement variable references",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "payrollDifferences",
      "labelAr": "فروق المسير ومراجع معالجتها",
      "labelEn": "Payroll differences and resolution",
      "type": "TABLE",
      "required": true,
      "options": [
        "البند",
        "المصدر",
        "القيمة السابقة",
        "القيمة المقترحة",
        "مرجع القرار"
      ]
    },
    {
      "key": "differenceReviewRef",
      "labelAr": "مرجع مراجعة وتسوية الفروق",
      "labelEn": "Difference review reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "TRN-COURSE-REPORT": [
    {
      "key": "coursePeriod",
      "labelAr": "فترة الدورة",
      "labelEn": "Course period",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "enrolledCount",
      "labelAr": "عدد الملتحقين",
      "labelEn": "Enrolled count",
      "type": "NUMBER",
      "required": true
    },
    {
      "key": "completedCount",
      "labelAr": "عدد المكملين",
      "labelEn": "Completed count",
      "type": "NUMBER",
      "required": true
    },
    {
      "key": "learningOutcomes",
      "labelAr": "مخرجات التعلم ونتائج قياسها",
      "labelEn": "Learning outcome results",
      "type": "TABLE",
      "required": true,
      "options": [
        "المخرج",
        "معيار القياس",
        "النتيجة",
        "مرجع الدليل"
      ]
    },
    {
      "key": "attendanceAssessmentRefs",
      "labelAr": "مراجع الحضور والتقييم",
      "labelEn": "Attendance and assessment references",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "qualityActions",
      "labelAr": "ملاحظات الجودة وإجراءاتها",
      "labelEn": "Quality findings and actions",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "TRN-ENROLLMENT": [
    {
      "key": "admissionStatus",
      "labelAr": "حالة القبول",
      "labelEn": "Admission status",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "prerequisiteReviewRef",
      "labelAr": "مرجع التحقق من متطلبات الالتحاق",
      "labelEn": "Prerequisite review reference",
      "type": "TEXT",
      "required": false
    },
    {
      "key": "consentRef",
      "labelAr": "مرجع الموافقة المطلوبة للالتحاق",
      "labelEn": "Enrollment consent reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "feeDecisionRef",
      "labelAr": "مرجع الرسوم وقرار معالجتها",
      "labelEn": "Fee handling reference",
      "type": "TEXT",
      "required": false
    },
    {
      "key": "admissionDecisionRef",
      "labelAr": "مرجع قرار القبول أو التعليق",
      "labelEn": "Admission or hold decision reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "TRN-ASSESSMENT": [
    {
      "key": "assessmentStandardRef",
      "labelAr": "المعيار وإصداره",
      "labelEn": "Assessment standard version",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "assessmentItems",
      "labelAr": "بنود التقييم والدرجات والأدلة",
      "labelEn": "Assessment items scores and evidence",
      "type": "TABLE",
      "required": true,
      "options": [
        "البند",
        "المعيار",
        "الدرجة",
        "مرجع الدليل"
      ]
    },
    {
      "key": "assessorRef",
      "labelAr": "مرجع المقيّم وصفته",
      "labelEn": "Assessor reference and role",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "attemptRecord",
      "labelAr": "المحاولات وإعادة التقييم",
      "labelEn": "Attempts and reassessment",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "skillsAcknowledgementRefs",
      "labelAr": "مراجع المهارات والإقرار أو الاعتراض",
      "labelEn": "Skills acknowledgement or appeal references",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "MAR-TRIP-REPORT": [
    {
      "key": "plannedDeparture",
      "labelAr": "وقت المغادرة المخطط",
      "labelEn": "Planned departure",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "actualDeparture",
      "labelAr": "وقت المغادرة الفعلي",
      "labelEn": "Actual departure",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "plannedReturn",
      "labelAr": "وقت العودة المخطط",
      "labelEn": "Planned return",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "actualReturn",
      "labelAr": "وقت العودة الفعلي",
      "labelEn": "Actual return",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "participantReconciliation",
      "labelAr": "مطابقة المشاركين والطاقم",
      "labelEn": "Participant and crew reconciliation",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "tripEvents",
      "labelAr": "الأحداث والانحرافات والإجراءات",
      "labelEn": "Trip events deviations and actions",
      "type": "TABLE",
      "required": true,
      "options": [
        "الوقت",
        "الحدث",
        "الأثر",
        "الإجراء",
        "مرجع الدليل"
      ]
    },
    {
      "key": "tripClosureRef",
      "labelAr": "مرجع إقفال الرحلة",
      "labelEn": "Trip closure reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "MAR-TRIP-CHECKLIST": [
    {
      "key": "activityScope",
      "labelAr": "نطاق النشاط ومعيار الفحص",
      "labelEn": "Activity and inspection scope",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "checkItems",
      "labelAr": "بنود الجاهزية ونتيجة كل بند",
      "labelEn": "Readiness checks and findings",
      "type": "TABLE",
      "required": true,
      "options": [
        "البند",
        "المعيار",
        "النتيجة",
        "المتحقق",
        "وقت الفحص",
        "مرجع الدليل"
      ]
    },
    {
      "key": "blockers",
      "labelAr": "موانع التشغيل والإجراء المطلوب",
      "labelEn": "Operating blockers and required action",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "recheckDecisionRef",
      "labelAr": "مرجع إعادة التحقق وقرار المختص",
      "labelEn": "Recheck and competent decision reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "MAR-DIVE-LOG": [
    {
      "key": "entryTime",
      "labelAr": "وقت دخول الماء",
      "labelEn": "Water entry time",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "exitTime",
      "labelAr": "وقت الخروج من الماء",
      "labelEn": "Water exit time",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "buddyRef",
      "labelAr": "مرجع شريك الغوص",
      "labelEn": "Dive buddy reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "supervisorRef",
      "labelAr": "مرجع المشرف المخول",
      "labelEn": "Authorized supervisor reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "gasEquipmentRefs",
      "labelAr": "مراجع الغاز والمعدات المستخدمة",
      "labelEn": "Gas and equipment references",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "planExceptionNotes",
      "labelAr": "الخطة والاستثناءات ومراجع تقييمها",
      "labelEn": "Plan exceptions and review references",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "INV-STOCK-REPORT": [
    {
      "key": "inventoryPeriod",
      "labelAr": "فترة تقرير المخزون",
      "labelEn": "Inventory reporting period",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "stockBalances",
      "labelAr": "الأرصدة والحركات والمتاح والمحجوز",
      "labelEn": "Stock balances movements and availability",
      "type": "TABLE",
      "required": true,
      "options": [
        "الصنف",
        "رصيد الافتتاح",
        "الوارد",
        "الصادر",
        "المتاح",
        "المحجوز",
        "الفروق"
      ]
    },
    {
      "key": "stockAlerts",
      "labelAr": "تنبيهات الاحتياج والنواقص",
      "labelEn": "Stock and demand alerts",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "movementEvidenceRefs",
      "labelAr": "مراجع الحركات والمراجعة",
      "labelEn": "Movement and review references",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "INV-PURCHASE-REQUEST": [
    {
      "key": "purchaseLines",
      "labelAr": "بنود طلب الشراء ومواصفاتها",
      "labelEn": "Purchase request lines and specifications",
      "type": "TABLE",
      "required": true,
      "options": [
        "الصنف",
        "المواصفة",
        "الوحدة",
        "الكمية",
        "التكلفة التقديرية"
      ]
    },
    {
      "key": "requiredDeliveryDate",
      "labelAr": "التاريخ المطلوب للتوريد",
      "labelEn": "Required delivery date",
      "type": "DATE",
      "required": true
    },
    {
      "key": "costCenterRef",
      "labelAr": "مرجع مركز التكلفة",
      "labelEn": "Cost center reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "budgetApprovalRef",
      "labelAr": "مرجع مراجعة واعتماد الاحتياج",
      "labelEn": "Budget and requisition approval reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "INV-TRANSFER": [
    {
      "key": "transferLines",
      "labelAr": "بنود التحويل والكميات والحالة",
      "labelEn": "Transfer quantities and condition",
      "type": "TABLE",
      "required": true,
      "options": [
        "الصنف",
        "الرقم التسلسلي",
        "الكمية",
        "الوحدة",
        "الحالة"
      ]
    },
    {
      "key": "dispatchEvidenceRef",
      "labelAr": "مرجع إثبات التسليم",
      "labelEn": "Dispatch evidence reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "receiptEvidenceRef",
      "labelAr": "مرجع إثبات التسلم",
      "labelEn": "Receipt evidence reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "transferDifferences",
      "labelAr": "الفروق ومعالجتها",
      "labelEn": "Transfer differences and handling",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "stockMovementRef",
      "labelAr": "مرجع حركة النقل الأصلية",
      "labelEn": "Canonical transfer movement reference",
      "type": "TEXT",
      "required": true
    }
  ],
  "FIN-TRANSACTION-REPORT": [
    {
      "key": "reportingPeriod",
      "labelAr": "الفترة المالية",
      "labelEn": "Reporting period",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "currency",
      "labelAr": "العملة",
      "labelEn": "Currency",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "transactionType",
      "labelAr": "نوع المعاملة",
      "labelEn": "Transaction type",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "journalAccountRefs",
      "labelAr": "مراجع القيد والحسابات",
      "labelEn": "Journal and account references",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "financialReconciliation",
      "labelAr": "نتيجة المطابقة والفروق",
      "labelEn": "Reconciliation and differences",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "financialDecisionExecutionRefs",
      "labelAr": "مراجع الاعتماد والتنفيذ",
      "labelEn": "Approval and execution references",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "FIN-PAYMENT-VOUCHER": [
    {
      "key": "currency",
      "labelAr": "العملة",
      "labelEn": "Currency",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "paymentPurpose",
      "labelAr": "سبب الصرف",
      "labelEn": "Payment purpose",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "supportingDocumentRef",
      "labelAr": "مرجع المستند المؤيد",
      "labelEn": "Supporting document reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "authorizedDecisionRef",
      "labelAr": "مرجع قرار صاحب الصلاحية",
      "labelEn": "Authorized decision reference",
      "type": "TEXT",
      "required": false
    },
    {
      "key": "paymentExecutionRef",
      "labelAr": "مرجع التنفيذ من المسار المالي",
      "labelEn": "Canonical payment execution reference",
      "type": "TEXT",
      "required": false
    },
    {
      "key": "paymentReconciliation",
      "labelAr": "حالة المطابقة والاستثناءات",
      "labelEn": "Payment reconciliation status",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "FIN-RECEIPT-VOUCHER": [
    {
      "key": "currency",
      "labelAr": "العملة",
      "labelEn": "Currency",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "collectionDate",
      "labelAr": "تاريخ التحصيل",
      "labelEn": "Collection date",
      "type": "DATE",
      "required": true
    },
    {
      "key": "collectionMethod",
      "labelAr": "طريقة التحصيل",
      "labelEn": "Collection method",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "invoiceBookingRef",
      "labelAr": "مرجع الفاتورة أو الحجز",
      "labelEn": "Invoice or booking reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "receiptAllocation",
      "labelAr": "توزيع المبلغ على المستحقات",
      "labelEn": "Receipt allocation",
      "type": "TABLE",
      "required": true,
      "options": [
        "المستحق",
        "المرجع",
        "المبلغ",
        "مرجع المطابقة"
      ]
    },
    {
      "key": "receiptReconciliation",
      "labelAr": "حالة المطابقة والفروق",
      "labelEn": "Receipt reconciliation status",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "FIN-BUDGET-REVIEW": [
    {
      "key": "budgetComparison",
      "labelAr": "المعتمد والفعلي والالتزامات والانحراف",
      "labelEn": "Budget actual commitment and variance",
      "type": "TABLE",
      "required": true,
      "options": [
        "البند",
        "مركز التكلفة",
        "المعتمد",
        "الفعلي",
        "الالتزامات",
        "الانحراف",
        "المصدر"
      ]
    },
    {
      "key": "unitCostBasis",
      "labelAr": "تكلفة الوحدة وأساس حسابها",
      "labelEn": "Unit cost and basis",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "forecastScenarios",
      "labelAr": "التوقع والبدائل والافتراضات",
      "labelEn": "Forecast scenarios and assumptions",
      "type": "TABLE",
      "required": true,
      "options": [
        "السيناريو",
        "الفترة",
        "التوقع",
        "الافتراض",
        "المصدر"
      ]
    },
    {
      "key": "financeRecommendation",
      "labelAr": "التوصية ومسؤول المعالجة",
      "labelEn": "Finance recommendation and owner",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "SAF-INCIDENT-REPORT": [
    {
      "key": "incidentTimeline",
      "labelAr": "التسلسل الزمني للواقعة والاستجابة",
      "labelEn": "Incident and response timeline",
      "type": "TABLE",
      "required": true,
      "options": [
        "الوقت",
        "الواقعة",
        "المصدر",
        "الإجراء"
      ]
    },
    {
      "key": "factEvidenceRefs",
      "labelAr": "الوقائع ومراجع الأدلة المقيدة",
      "labelEn": "Facts and restricted evidence references",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "investigationRef",
      "labelAr": "مرجع التحقيق المخول",
      "labelEn": "Authorized investigation reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "specialistReferrals",
      "labelAr": "الإحالات القانونية والتأمينية والمختصة",
      "labelEn": "Specialist referrals",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "incidentRecommendations",
      "labelAr": "التوصيات ومتابعتها",
      "labelEn": "Incident recommendations",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "initialIncidentRef",
      "labelAr": "مرجع البلاغ الأولي للحادث",
      "labelEn": "Initial incident reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "SAF-INCIDENT": [
    {
      "key": "incidentOccurredAt",
      "labelAr": "وقت الواقعة",
      "labelEn": "Incident occurrence time",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "incidentReportedAt",
      "labelAr": "وقت الإبلاغ",
      "labelEn": "Incident reporting time",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "incidentType",
      "labelAr": "نوع الحدث",
      "labelEn": "Incident type",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "immediateResponse",
      "labelAr": "الاستجابة العاجلة",
      "labelEn": "Immediate response",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "reportingPartyRef",
      "labelAr": "مرجع جهة الإبلاغ",
      "labelEn": "Reporting party reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "responseOwnerRef",
      "labelAr": "مسؤول الاستجابة والمتابعة",
      "labelEn": "Response owner reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "incidentCaseRef",
      "labelAr": "مرجع سجل الحادث الواحد",
      "labelEn": "Single incident case reference",
      "type": "TEXT",
      "required": true
    }
  ],
  "SAF-CAPA": [
    {
      "key": "findingSourceRef",
      "labelAr": "مرجع الملاحظة أو التدقيق أو الشكوى",
      "labelEn": "Finding audit or complaint reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "actionOwnerRef",
      "labelAr": "مالك الإجراء",
      "labelEn": "Action owner reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "actionDueDate",
      "labelAr": "موعد الإجراء",
      "labelEn": "Action due date",
      "type": "DATE",
      "required": true
    },
    {
      "key": "executionStatus",
      "labelAr": "حالة تنفيذ الإجراء",
      "labelEn": "Action execution status",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "effectivenessEvidenceRef",
      "labelAr": "مرجع التحقق المستقل من الفاعلية",
      "labelEn": "Independent effectiveness evidence reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "closureOrReworkRef",
      "labelAr": "مرجع الإقفال أو الإعادة",
      "labelEn": "Closure or rework reference",
      "type": "TEXT",
      "required": true
    }
  ],
  "CEX-CASE-REPORT": [
    {
      "key": "caseType",
      "labelAr": "نوع الحالة",
      "labelEn": "Case type",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "casePriority",
      "labelAr": "أولوية الحالة",
      "labelEn": "Case priority",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "receivedAt",
      "labelAr": "وقت الاستلام",
      "labelEn": "Received time",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "firstResponseAt",
      "labelAr": "وقت أول استجابة",
      "labelEn": "First response time",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "caseOwnerRef",
      "labelAr": "مسؤول الحالة",
      "labelEn": "Case owner reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "bookingReferralRefs",
      "labelAr": "مراجع الحجز والإحالات",
      "labelEn": "Booking and referral references",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "notificationClosureRefs",
      "labelAr": "مراجع الإشعار والإقفال",
      "labelEn": "Notification and closure references",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "CEX-COMPLAINT": [
    {
      "key": "receivedDate",
      "labelAr": "تاريخ استلام الشكوى",
      "labelEn": "Complaint received date",
      "type": "DATE",
      "required": true
    },
    {
      "key": "complaintCategory",
      "labelAr": "تصنيف الشكوى",
      "labelEn": "Complaint category",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "complaintImpact",
      "labelAr": "أثر الشكوى",
      "labelEn": "Complaint impact",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "requestedRemedy",
      "labelAr": "المعالجة المطلوبة دون وعد غير مخول",
      "labelEn": "Requested remedy",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "complaintEvidenceRefs",
      "labelAr": "مراجع أدلة الشكوى",
      "labelEn": "Complaint evidence references",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "receivingDepartment",
      "labelAr": "الإدارة المستلمة",
      "labelEn": "Receiving department",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "responseDueDate",
      "labelAr": "موعد المتابعة",
      "labelEn": "Response due date",
      "type": "DATE",
      "required": true
    }
  ],
  "CEX-RESOLUTION": [
    {
      "key": "resolutionDecisionRef",
      "labelAr": "مرجع قرار المعالجة",
      "labelEn": "Resolution decision reference",
      "type": "TEXT",
      "required": false
    },
    {
      "key": "resolutionExecutionRefs",
      "labelAr": "مراجع تنفيذ المعالجة والمالية عند انطباقها",
      "labelEn": "Resolution and finance execution references",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "customerNoticeRef",
      "labelAr": "مرجع إشعار العميل",
      "labelEn": "Customer notification reference",
      "type": "TEXT",
      "required": false
    },
    {
      "key": "closureOrReopenReason",
      "labelAr": "مسوغات الإقفال أو إعادة الفتح",
      "labelEn": "Closure or reopening grounds",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "CEX-SERVICE-REQUEST": [
    {
      "key": "requestKind",
      "labelAr": "نوع الطلب بما يشمل تعديل الحجز",
      "labelEn": "Request kind including booking amendment",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "bookingChangeComparison",
      "labelAr": "الحجز السابق والتعديل المطلوب",
      "labelEn": "Previous and requested booking values",
      "type": "TABLE",
      "required": true,
      "options": [
        "البند",
        "القيمة السابقة",
        "القيمة المطلوبة",
        "الأثر"
      ]
    },
    {
      "key": "pricePolicyImpact",
      "labelAr": "أثر السعر والسياسة وإصدارها",
      "labelEn": "Price and policy impact",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "serviceDecisionRef",
      "labelAr": "مرجع قرار معالجة الطلب",
      "labelEn": "Service request decision reference",
      "type": "TEXT",
      "required": false
    },
    {
      "key": "customerNoticeRef",
      "labelAr": "مرجع إشعار العميل بالتغيير",
      "labelEn": "Customer change notification reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "MKT-CAMPAIGN-REPORT": [
    {
      "key": "measurementPeriod",
      "labelAr": "فترة القياس",
      "labelEn": "Measurement period",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "campaignObjective",
      "labelAr": "هدف الحملة",
      "labelEn": "Campaign objective",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "campaignSpend",
      "labelAr": "الإنفاق ومصدره",
      "labelEn": "Campaign spend and source",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "campaignMetrics",
      "labelAr": "المؤشرات والنتائج ومصادرها",
      "labelEn": "Campaign metrics and sources",
      "type": "TABLE",
      "required": true,
      "options": [
        "المؤشر",
        "البسط",
        "المقام",
        "الفترة",
        "النتيجة",
        "المصدر"
      ]
    },
    {
      "key": "campaignVariance",
      "labelAr": "الانحراف عن المستهدف",
      "labelEn": "Campaign variance",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "campaignRecommendation",
      "labelAr": "التوصية والتحسين المقترح",
      "labelEn": "Campaign recommendation",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "MKT-CAMPAIGN-BRIEF": [
    {
      "key": "targetAudience",
      "labelAr": "الجمهور المستهدف",
      "labelEn": "Target audience",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "campaignOffer",
      "labelAr": "العرض والرسالة",
      "labelEn": "Campaign offer and message",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "successCriteria",
      "labelAr": "معيار النجاح ومصدر القياس",
      "labelEn": "Success criteria and measurement source",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "channelOwnersSchedule",
      "labelAr": "القنوات والملاك والمواعيد",
      "labelEn": "Channel owners and schedule",
      "type": "TABLE",
      "required": true,
      "options": [
        "القناة",
        "المالك",
        "الموعد",
        "المخرج"
      ]
    },
    {
      "key": "rightsReviewRefs",
      "labelAr": "مراجع الحقوق والمراجعات",
      "labelEn": "Rights and review references",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "budgetAuthorizationRef",
      "labelAr": "مرجع حدود الميزانية والموافقة",
      "labelEn": "Budget authorization reference",
      "type": "TEXT",
      "required": true
    }
  ],
  "MKT-CONTENT-APPROVAL": [
    {
      "key": "contentVersionDigest",
      "labelAr": "معرف النسخة وبصمتها",
      "labelEn": "Content version and digest",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "sourceAssetRefs",
      "labelAr": "روابط الأصل والملفات المصدرية",
      "labelEn": "Source asset references",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "editorialReviewRef",
      "labelAr": "مرجع المراجعة التحريرية",
      "labelEn": "Editorial review reference",
      "type": "TEXT",
      "required": false
    },
    {
      "key": "specialistRightsReviews",
      "labelAr": "نتائج المراجعة المتخصصة والحقوق",
      "labelEn": "Specialist and rights reviews",
      "type": "TABLE",
      "required": true,
      "options": [
        "المراجعة",
        "المراجع",
        "النتيجة",
        "مرجع الدليل"
      ]
    },
    {
      "key": "publicationDecisionRef",
      "labelAr": "مرجع قرار نشر النسخة المحددة",
      "labelEn": "Specific version publication decision reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "TEC-SECURITY-REPORT": [
    {
      "key": "securityReportScope",
      "labelAr": "نطاق التقرير وفترته",
      "labelEn": "Security report scope and period",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "securityFindings",
      "labelAr": "نتائج الفحص والأثر والمخاطر",
      "labelEn": "Security findings impact and risk",
      "type": "TABLE",
      "required": true,
      "options": [
        "البند",
        "النتيجة",
        "الأثر",
        "الخطر",
        "مرجع الدليل"
      ]
    },
    {
      "key": "remediationOwners",
      "labelAr": "المعالجات وملاكها ومواعيدها",
      "labelEn": "Remediation owners and deadlines",
      "type": "TABLE",
      "required": true,
      "options": [
        "المعالجة",
        "المالك",
        "الموعد",
        "الحالة"
      ]
    },
    {
      "key": "securityReviewRef",
      "labelAr": "مرجع مراجعة المختص",
      "labelEn": "Specialist security review reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "TEC-ACCESS-REQUEST": [
    {
      "key": "accessPurpose",
      "labelAr": "مبرر طلب الوصول",
      "labelEn": "Access purpose",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "organizationScope",
      "labelAr": "الجهة والنطاق",
      "labelEn": "Organization and access scope",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "accessRole",
      "labelAr": "الدور وحدوده",
      "labelEn": "Access role and limits",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "accessStartsOn",
      "labelAr": "بداية مدة الوصول",
      "labelEn": "Access start date",
      "type": "DATE",
      "required": true
    },
    {
      "key": "accessEndsOn",
      "labelAr": "انتهاء مدة الوصول",
      "labelEn": "Access end date",
      "type": "DATE",
      "required": true
    },
    {
      "key": "separationApprovalRefs",
      "labelAr": "مراجع الموافقة وفصل المهام",
      "labelEn": "Approval and separation references",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "iamExecutionVerificationRef",
      "labelAr": "مرجع تنفيذ الوصول والتحقق منه",
      "labelEn": "IAM execution and verification reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "TEC-SECURITY-INCIDENT": [
    {
      "key": "detectedAt",
      "labelAr": "وقت الكشف",
      "labelEn": "Detection time",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "securityImpact",
      "labelAr": "أثر الحادث",
      "labelEn": "Security impact",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "containmentActions",
      "labelAr": "خطوات الاحتواء",
      "labelEn": "Containment actions",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "restrictedEvidenceRefs",
      "labelAr": "مراجع الأدلة المقيدة دون أسرار",
      "labelEn": "Restricted evidence references",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "incidentResponderRef",
      "labelAr": "مسؤول الاستجابة",
      "labelEn": "Incident responder reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "resolutionVerificationRefs",
      "labelAr": "مراجع المعالجة والتحقق",
      "labelEn": "Resolution and verification references",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "FAC-MAINTENANCE-REPORT": [
    {
      "key": "faultCause",
      "labelAr": "العطل والسبب",
      "labelEn": "Fault and cause",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "completedTasksParts",
      "labelAr": "العمل المنفذ والقطع",
      "labelEn": "Completed work and parts",
      "type": "TABLE",
      "required": true,
      "options": [
        "العمل",
        "القطعة",
        "الكمية",
        "مرجع التنفيذ"
      ]
    },
    {
      "key": "downtime",
      "labelAr": "مدة التوقف ومصدر قياسها",
      "labelEn": "Downtime and measurement source",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "technicianRef",
      "labelAr": "مرجع الفني المخول",
      "labelEn": "Authorized technician reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "postMaintenanceTest",
      "labelAr": "الاختبار بعد الصيانة",
      "labelEn": "Post maintenance test",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "workAcceptanceRef",
      "labelAr": "مرجع قبول الأعمال",
      "labelEn": "Work acceptance reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "FAC-WORK-ORDER": [
    {
      "key": "workDescription",
      "labelAr": "وصف العمل المطلوب",
      "labelEn": "Required work description",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "workDueDate",
      "labelAr": "موعد العمل",
      "labelEn": "Work due date",
      "type": "DATE",
      "required": true
    },
    {
      "key": "assignedTechnicianRef",
      "labelAr": "مرجع الفني المكلف",
      "labelEn": "Assigned technician reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "resourceRequirements",
      "labelAr": "الموارد والقطع المطلوبة",
      "labelEn": "Required resources and parts",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "permitSafetyRefs",
      "labelAr": "مراجع تصريح العمل والسلامة",
      "labelEn": "Work permit and safety references",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "inspectionAcceptanceRefs",
      "labelAr": "مراجع الفحص والقبول",
      "labelEn": "Inspection and acceptance references",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "FAC-ASSET-INSPECTION": [
    {
      "key": "assetClass",
      "labelAr": "فئة الأصل ومعيار الفحص",
      "labelEn": "Asset class and inspection standard",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "inspectionItems",
      "labelAr": "بنود فحص الأصل ونتائجها",
      "labelEn": "Asset inspection findings",
      "type": "TABLE",
      "required": true,
      "options": [
        "البند",
        "المعيار",
        "النتيجة",
        "العيب",
        "الخطورة",
        "مرجع الدليل"
      ]
    },
    {
      "key": "inspectorRef",
      "labelAr": "مرجع الفاحص المخول",
      "labelEn": "Authorized inspector reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "inspectionAction",
      "labelAr": "الإجراء المطلوب ومسؤوله",
      "labelEn": "Required action and owner",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "reinspectionRef",
      "labelAr": "مرجع إعادة التحقق",
      "labelEn": "Reinspection reference",
      "type": "TEXT",
      "required": true
    }
  ],
  "ADM-CORRESPONDENCE-REPORT": [
    {
      "key": "reportingPeriod",
      "labelAr": "فترة المتابعة",
      "labelEn": "Reporting period",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "correspondenceDirection",
      "labelAr": "اتجاه المعاملة",
      "labelEn": "Correspondence direction",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "correspondenceState",
      "labelAr": "حالة المعاملة",
      "labelEn": "Correspondence state",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "correspondenceTimeline",
      "labelAr": "مواعيد الاستلام والإحالة والاستحقاق والإقفال",
      "labelEn": "Correspondence timeline",
      "type": "TABLE",
      "required": true,
      "options": [
        "المرحلة",
        "التاريخ",
        "المسؤول",
        "مرجع الدليل"
      ]
    },
    {
      "key": "followupOutcome",
      "labelAr": "نتيجة المتابعة والمعالجة",
      "labelEn": "Followup outcome",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "ADM-INCOMING-CORRESPONDENCE": [
    {
      "key": "receivedDate",
      "labelAr": "تاريخ الاستلام",
      "labelEn": "Receipt date",
      "type": "DATE",
      "required": true
    },
    {
      "key": "receiptChannel",
      "labelAr": "قناة الاستلام",
      "labelEn": "Receipt channel",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "classification",
      "labelAr": "تصنيف المعاملة",
      "labelEn": "Correspondence classification",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "confidentiality",
      "labelAr": "تصنيف السرية",
      "labelEn": "Confidentiality classification",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "attachmentIndex",
      "labelAr": "قائمة المرفقات ومراجعها",
      "labelEn": "Attachment index",
      "type": "TABLE",
      "required": true,
      "options": [
        "المرفق",
        "الإصدار",
        "مرجع الحفظ"
      ]
    },
    {
      "key": "referralOwnerRef",
      "labelAr": "مرجع الإحالة ومسؤولها",
      "labelEn": "Referral and owner reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "responseDueDate",
      "labelAr": "أجل المعالجة",
      "labelEn": "Response due date",
      "type": "DATE",
      "required": true
    }
  ],
  "ADM-MEETING-MINUTES": [
    {
      "key": "meetingDate",
      "labelAr": "تاريخ الاجتماع",
      "labelEn": "Meeting date",
      "type": "DATE",
      "required": true
    },
    {
      "key": "meetingAttendance",
      "labelAr": "الحضور وصفاتهم",
      "labelEn": "Attendance and roles",
      "type": "TABLE",
      "required": true,
      "options": [
        "المشارك",
        "الصفة",
        "حالة الحضور"
      ]
    },
    {
      "key": "meetingAgenda",
      "labelAr": "جدول الأعمال والمرفقات",
      "labelEn": "Agenda and attachments",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "deliberations",
      "labelAr": "المداولات والملاحظات",
      "labelEn": "Deliberations",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "decisionAssignments",
      "labelAr": "القرارات والتكليفات ومواعيدها",
      "labelEn": "Decisions assignments and deadlines",
      "type": "TABLE",
      "required": true,
      "options": [
        "القرار",
        "المكلف",
        "الموعد",
        "مرجع التسلم"
      ]
    },
    {
      "key": "minutesAcknowledgementRef",
      "labelAr": "مرجع إقرار المحضر",
      "labelEn": "Minutes acknowledgement reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "EXE-DECISION-REPORT": [
    {
      "key": "decisionSubject",
      "labelAr": "موضوع القرار",
      "labelEn": "Decision subject",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "decisionRationale",
      "labelAr": "مسوغات القرار",
      "labelEn": "Decision rationale",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "decisionScope",
      "labelAr": "نطاق القرار",
      "labelEn": "Decision scope",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "effectiveDate",
      "labelAr": "تاريخ السريان",
      "labelEn": "Effective date",
      "type": "DATE",
      "required": true
    },
    {
      "key": "originalDecisionRef",
      "labelAr": "مرجع أصل القرار التنفيذي",
      "labelEn": "Original executive decision reference",
      "type": "TEXT",
      "required": false
    },
    {
      "key": "approvalNotificationRefs",
      "labelAr": "مراجع الموافقات والتبليغ",
      "labelEn": "Approval and notification references",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "EXE-DECISION": [
    {
      "key": "decisionScope",
      "labelAr": "النطاق والجهات المخاطبة",
      "labelEn": "Scope and addressees",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "effectiveDate",
      "labelAr": "تاريخ السريان",
      "labelEn": "Effective date",
      "type": "DATE",
      "required": true
    },
    {
      "key": "financialOperatingLimits",
      "labelAr": "الحدود المالية أو التشغيلية",
      "labelEn": "Financial or operating limits",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "authorizedDecisionRef",
      "labelAr": "مرجع الاعتماد المخول",
      "labelEn": "Authorized approval reference",
      "type": "TEXT",
      "required": false
    },
    {
      "key": "decisionNoticeRef",
      "labelAr": "مرجع التبليغ",
      "labelEn": "Decision notification reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "EXE-FOLLOWUP": [
    {
      "key": "assignmentDueDate",
      "labelAr": "موعد التكليف",
      "labelEn": "Assignment due date",
      "type": "DATE",
      "required": true
    },
    {
      "key": "progressStatus",
      "labelAr": "حالة الإنجاز ودليلها",
      "labelEn": "Progress status and evidence",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "blockersEscalation",
      "labelAr": "العوائق والتصعيد",
      "labelEn": "Blockers and escalation",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "independentVerificationRef",
      "labelAr": "مرجع التحقق المستقل",
      "labelEn": "Independent verification reference",
      "type": "TEXT",
      "required": false
    },
    {
      "key": "closureDecisionRef",
      "labelAr": "مرجع قرار الإقفال أو الإعادة",
      "labelEn": "Closure or rework decision reference",
      "type": "TEXT",
      "required": false
    },
    {
      "key": "followupDate",
      "labelAr": "تاريخ المتابعة",
      "labelEn": "Followup date",
      "type": "DATE",
      "required": true
    }
  ],
  "RND-STUDY-REPORT": [
    {
      "key": "studyScope",
      "labelAr": "نطاق الدراسة",
      "labelEn": "Study scope",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "methodSample",
      "labelAr": "المنهج والعينة",
      "labelEn": "Method and sample",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "sourceDataPeriod",
      "labelAr": "فترة البيانات وتواريخ مصادرها",
      "labelEn": "Source data period",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "studyFindings",
      "labelAr": "النتائج والأدلة",
      "labelEn": "Study findings and evidence",
      "type": "TABLE",
      "required": true,
      "options": [
        "النتيجة",
        "القياس",
        "المصدر",
        "حدود الاستنتاج"
      ]
    },
    {
      "key": "studyLimitations",
      "labelAr": "قيود الدراسة",
      "labelEn": "Study limitations",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "alternativesReviewRef",
      "labelAr": "البدائل ومرجع المراجعة",
      "labelEn": "Alternatives and review reference",
      "type": "TEXTAREA",
      "required": false
    }
  ],
  "RND-RESEARCH-BRIEF": [
    {
      "key": "researchScope",
      "labelAr": "النطاق والجمهور",
      "labelEn": "Research scope and audience",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "researchMethod",
      "labelAr": "المنهج المقترح",
      "labelEn": "Proposed research method",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "researchScheduleResources",
      "labelAr": "الوقت والموارد",
      "labelEn": "Schedule and resources",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "expectedDeliverables",
      "labelAr": "المخرجات ومعيار قبولها",
      "labelEn": "Deliverables and acceptance criteria",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "researchOwnerRef",
      "labelAr": "مالك سؤال البحث",
      "labelEn": "Research question owner reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "proposalScopeRefs",
      "labelAr": "مراجع المقترح واعتماد النطاق",
      "labelEn": "Proposal and scope references",
      "type": "TEXTAREA",
      "required": true
    }
  ],
  "RND-FEASIBILITY": [
    {
      "key": "feasibilityAlternatives",
      "labelAr": "مقارنة البدائل والتكاليف والمنافع",
      "labelEn": "Alternatives costs and benefits",
      "type": "TABLE",
      "required": true,
      "options": [
        "البديل",
        "التكلفة",
        "المنفعة أو الإيراد",
        "الفترة",
        "المصدر"
      ]
    },
    {
      "key": "assumptionEvidence",
      "labelAr": "الافتراضات الحرجة ومصادرها",
      "labelEn": "Critical assumptions and sources",
      "type": "TABLE",
      "required": true,
      "options": [
        "الافتراض",
        "القيمة",
        "المصدر",
        "القيد"
      ]
    },
    {
      "key": "sensitivityRisk",
      "labelAr": "الحساسية والمخاطر",
      "labelEn": "Risk and sensitivity",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "decisionConditions",
      "labelAr": "شروط وحدود التوصية",
      "labelEn": "Recommendation conditions",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "authorizedDecisionRef",
      "labelAr": "مرجع قرار صاحب الصلاحية",
      "labelEn": "Authorized owner decision reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "LEG-LEGAL-REPORT": [
    {
      "key": "legalQuestion",
      "labelAr": "سؤال الاستشارة",
      "labelEn": "Legal question",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "caseFacts",
      "labelAr": "الوقائع المثبتة",
      "labelEn": "Recorded facts",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "legalSourceVersions",
      "labelAr": "المصادر وإصداراتها وتاريخ التحقق",
      "labelEn": "Sources versions and verification",
      "type": "TABLE",
      "required": true,
      "options": [
        "المصدر",
        "الإصدار",
        "تاريخ الاطلاع",
        "موضع الاستدلال"
      ]
    },
    {
      "key": "legalAnalysis",
      "labelAr": "التحليل للمراجعة المختصة",
      "labelEn": "Analysis for specialist review",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "alternativesReservations",
      "labelAr": "البدائل والتحفظات",
      "labelEn": "Alternatives and reservations",
      "type": "TEXTAREA",
      "required": true
    },
    {
      "key": "authorizedSpecialistRef",
      "labelAr": "مرجع تكليف المختص المخول",
      "labelEn": "Authorized specialist assignment reference",
      "type": "TEXT",
      "required": true
    }
  ],
  "LEG-CONTRACT-REVIEW": [
    {
      "key": "contractVersionRef",
      "labelAr": "مرجع العقد وإصداره محل المراجعة",
      "labelEn": "Reviewed contract version",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "reviewedClauses",
      "labelAr": "البنود محل المراجعة وأثرها",
      "labelEn": "Reviewed clauses and impact",
      "type": "TABLE",
      "required": true,
      "options": [
        "البند",
        "الملاحظة",
        "الأثر",
        "المقترح",
        "مرجع المراجعة"
      ]
    },
    {
      "key": "independentReviewerRef",
      "labelAr": "مرجع المراجع المستقل وصفته",
      "labelEn": "Independent reviewer reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "reviewHandlingDecisionRef",
      "labelAr": "مرجع قرار معالجة الملاحظات",
      "labelEn": "Review handling decision reference",
      "type": "TEXT",
      "required": false
    }
  ],
  "LEG-INSURANCE-CLAIM": [
    {
      "key": "claimNoticeDate",
      "labelAr": "تاريخ الإشعار بالمطالبة",
      "labelEn": "Claim notice date",
      "type": "DATE",
      "required": true
    },
    {
      "key": "coverageScopeRef",
      "labelAr": "مرجع نطاق التغطية ومراجعة انطباقه",
      "labelEn": "Coverage applicability review reference",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "claimedAmount",
      "labelAr": "المبلغ محل المطالبة",
      "labelEn": "Claim amount",
      "type": "NUMBER",
      "required": true
    },
    {
      "key": "currency",
      "labelAr": "العملة",
      "labelEn": "Currency",
      "type": "TEXT",
      "required": true
    },
    {
      "key": "claimDocumentIndex",
      "labelAr": "مستندات المطالبة ومراجعها",
      "labelEn": "Claim documents and references",
      "type": "TABLE",
      "required": true,
      "options": [
        "المستند",
        "الإصدار",
        "مرجع الحفظ"
      ]
    },
    {
      "key": "insurerCorrespondence",
      "labelAr": "المراسلات والموعد وحالة المطالبة",
      "labelEn": "Insurer correspondence deadline and status",
      "type": "TEXTAREA",
      "required": true
    }
  ]
};

const additions: Array<{code:string;titleAr:string;titleEn:string;department:DocumentDepartment;fields:DocumentFieldDefinition[]}> = [
  {
    "code": "HR-RECRUITMENT-REVIEW",
    "titleAr": "سجل الترشيح والمقابلات وتوصية التوظيف",
    "titleEn": "Recruitment and Interview Review",
    "department": "HR",
    "fields": [
      {
        "key": "staffingNeedRef",
        "labelAr": "مرجع الاحتياج المعتمد",
        "labelEn": "Approved staffing need reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "candidateRecordRef",
        "labelAr": "مرجع المرشح في السجل المقيد",
        "labelEn": "Restricted candidate reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "comparisonCriteria",
        "labelAr": "معايير المفاضلة وأوزانها",
        "labelEn": "Comparison criteria and weights",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "interviewAssessments",
        "labelAr": "المقابلات والتقييم والأدلة",
        "labelEn": "Interview assessments",
        "type": "TABLE",
        "required": true,
        "options": [
          "المقابلة",
          "المقيّم",
          "المعيار",
          "التقييم",
          "مرجع الدليل"
        ]
      },
      {
        "key": "conflictReviewRef",
        "labelAr": "مرجع فحص تعارض المصالح",
        "labelEn": "Conflict review reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "recruitmentRecommendation",
        "labelAr": "توصية التوظيف ومسوغاتها",
        "labelEn": "Recruitment recommendation",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "appointmentDecisionRef",
        "labelAr": "مرجع القرار المخول عند صدوره",
        "labelEn": "Authorized appointment decision reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "HR-DEVELOPMENT-PLAN",
    "titleAr": "خطة تطوير الموظف ومتابعة أثر التدريب",
    "titleEn": "Employee Development and Training Impact Plan",
    "department": "HR",
    "fields": [
      {
        "key": "employeeReference",
        "labelAr": "مرجع الموظف",
        "labelEn": "Employment reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "positionReference",
        "labelAr": "مرجع الوظيفة والتقييم",
        "labelEn": "Position and assessment reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "skillGaps",
        "labelAr": "فجوات المهارات وأدلتها",
        "labelEn": "Skill gaps and evidence",
        "type": "TABLE",
        "required": true,
        "options": [
          "المهارة",
          "المستوى المطلوب",
          "الفجوة",
          "مرجع الدليل"
        ]
      },
      {
        "key": "developmentActivities",
        "labelAr": "أهداف التطوير والأنشطة والموارد",
        "labelEn": "Development objectives and activities",
        "type": "TABLE",
        "required": true,
        "options": [
          "الهدف",
          "النشاط",
          "الموعد",
          "المسؤول",
          "المورد"
        ]
      },
      {
        "key": "impactMeasures",
        "labelAr": "قياس الأثر قبل التدريب وبعده",
        "labelEn": "Training impact measures",
        "type": "TABLE",
        "required": true,
        "options": [
          "المؤشر",
          "قبل",
          "بعد",
          "المصدر"
        ]
      },
      {
        "key": "developmentFollowupRef",
        "labelAr": "مرجع قرار المتابعة",
        "labelEn": "Development followup reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "HR-CREDENTIAL-REGISTER",
    "titleAr": "مصفوفة المؤهلات والصلاحية المهنية",
    "titleEn": "Credential and Professional Validity Register",
    "department": "HR",
    "fields": [
      {
        "key": "employeeReference",
        "labelAr": "مرجع الموظف",
        "labelEn": "Employment reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "positionActivityScope",
        "labelAr": "الوظيفة ونطاق النشاط",
        "labelEn": "Position and activity scope",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "credentialRegister",
        "labelAr": "المؤهلات والتحقق والصلاحية",
        "labelEn": "Credentials verification and validity",
        "type": "TABLE",
        "required": true,
        "options": [
          "المؤهل المطلوب",
          "الجهة المصدرة",
          "مرجع الوثيقة",
          "مرجع التحقق",
          "بداية السريان",
          "الانتهاء"
        ]
      },
      {
        "key": "practiceRestrictions",
        "labelAr": "قيود الممارسة المسجلة",
        "labelEn": "Recorded practice restrictions",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "renewalActions",
        "labelAr": "إجراءات التجديد والمسؤول والمواعيد",
        "labelEn": "Renewal actions owners and dates",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "assignmentDecisionRef",
        "labelAr": "مرجع قرار التكليف المخول",
        "labelEn": "Authorized assignment decision reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "HR-TRANSFER-ASSIGNMENT",
    "titleAr": "محضر تكليف أو نقل وتسليم بين المراكز",
    "titleEn": "Intercenter Assignment and Transfer Record",
    "department": "HR",
    "fields": [
      {
        "key": "employeeReference",
        "labelAr": "مرجع الموظف",
        "labelEn": "Employment reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "employmentMovementRef",
        "labelAr": "مرجع الحركة الوظيفية الأصلية",
        "labelEn": "Canonical employment movement reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "movementType",
        "labelAr": "نوع الحركة ومدتها",
        "labelEn": "Movement type and term",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "previousUnit",
        "labelAr": "الجهة والقسم السابق",
        "labelEn": "Previous organization and section",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "receivingUnit",
        "labelAr": "الجهة والقسم المستقبل",
        "labelEn": "Receiving organization and section",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "effectiveDate",
        "labelAr": "تاريخ السريان",
        "labelEn": "Effective date",
        "type": "DATE",
        "required": true
      },
      {
        "key": "movementRationale",
        "labelAr": "مسوغ التكليف أو النقل",
        "labelEn": "Assignment or transfer grounds",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "handoverChecklist",
        "labelAr": "الموافقات وتسليم المهام والعهد والوصول",
        "labelEn": "Handover approvals custody and access",
        "type": "TABLE",
        "required": true,
        "options": [
          "البند",
          "الجهة المسلمة",
          "الجهة المستلمة",
          "حالة التسليم",
          "مرجع الدليل"
        ]
      },
      {
        "key": "movementApprovalRef",
        "labelAr": "مرجع القرار المخول",
        "labelEn": "Authorized movement approval reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "MAR-RESOURCE-SCHEDULE",
    "titleAr": "جدول تشغيل وحجز موارد الرحلات",
    "titleEn": "Trip Resource and Capacity Schedule",
    "department": "MARINE_OPERATIONS",
    "fields": [
      {
        "key": "schedulePeriod",
        "labelAr": "فترة الجدول وإصداره",
        "labelEn": "Schedule period and version",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "tripResourceSchedule",
        "labelAr": "جدول الرحلات والوسائط والطواقم والسعة",
        "labelEn": "Trip resource and capacity schedule",
        "type": "TABLE",
        "required": true,
        "options": [
          "الرحلة",
          "الوسيط",
          "الطاقم",
          "البداية",
          "النهاية",
          "السعة",
          "مرجع الحجز"
        ]
      },
      {
        "key": "resourceConflicts",
        "labelAr": "التعارضات ونقص التغطية",
        "labelEn": "Resource conflicts and shortages",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "operatingAlternatives",
        "labelAr": "البدائل وأثرها",
        "labelEn": "Operating alternatives",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "scheduleDecisionRef",
        "labelAr": "مرجع قرار الجدولة أو التعديل",
        "labelEn": "Schedule decision reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "scheduleChangeLog",
        "labelAr": "سجل تعديل الجدول",
        "labelEn": "Schedule changes",
        "type": "TEXTAREA",
        "required": true
      }
    ]
  },
  {
    "code": "MAR-SITE-BERTH-READINESS",
    "titleAr": "محضر جاهزية واستلام موقع أو مرسى",
    "titleEn": "Site and Berth Readiness Handover",
    "department": "MARINE_OPERATIONS",
    "fields": [
      {
        "key": "siteBerthRef",
        "labelAr": "مرجع الموقع أو المرسى",
        "labelEn": "Site or berth reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "activityPeriod",
        "labelAr": "الاستخدام والفترة",
        "labelEn": "Activity and period",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "coordinationPermitRefs",
        "labelAr": "مراجع التنسيق والتصاريح",
        "labelEn": "Coordination and permit references",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "siteReadinessItems",
        "labelAr": "بنود الوصول والخدمات والمخاطر والدعم",
        "labelEn": "Access service risk and support checks",
        "type": "TABLE",
        "required": true,
        "options": [
          "البند",
          "المعيار",
          "النتيجة",
          "المسؤول",
          "مرجع الدليل"
        ]
      },
      {
        "key": "siteRestrictions",
        "labelAr": "موانع الاستخدام ومعالجتها",
        "labelEn": "Site restrictions and handling",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "siteOwnerRef",
        "labelAr": "مسؤول الموقع والاستلام",
        "labelEn": "Site owner and handover reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "siteReleaseDecisionRef",
        "labelAr": "مرجع قرار الجاهزية من المختص",
        "labelEn": "Competent readiness release reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "MAR-VESSEL-MAINTENANCE",
    "titleAr": "سجل صيانة وجاهزية وسيط بحري",
    "titleEn": "Marine Asset Maintenance and Return to Service",
    "department": "MARINE_OPERATIONS",
    "fields": [
      {
        "key": "vesselRef",
        "labelAr": "مرجع الوسيط البحري",
        "labelEn": "Marine asset reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "technicalRequirementsRef",
        "labelAr": "مرجع متطلبات المصنع والمختص",
        "labelEn": "Manufacturer and specialist requirements reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "maintenanceDueDate",
        "labelAr": "موعد الصيانة",
        "labelEn": "Maintenance due date",
        "type": "DATE",
        "required": true
      },
      {
        "key": "faultAndWork",
        "labelAr": "العطل أو المهمة ومسوغها",
        "labelEn": "Fault or maintenance task",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "authorizedTechnicianRef",
        "labelAr": "مرجع الفني المخول",
        "labelEn": "Authorized technician reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "workPartsEvidence",
        "labelAr": "الأعمال والقطع ومراجع التنفيذ",
        "labelEn": "Work parts and execution evidence",
        "type": "TABLE",
        "required": true,
        "options": [
          "العمل",
          "القطعة",
          "الكمية",
          "الفني",
          "مرجع التنفيذ"
        ]
      },
      {
        "key": "postMaintenanceInspection",
        "labelAr": "الفحص اللاحق والموانع",
        "labelEn": "Post maintenance inspection and blockers",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "returnToServiceDecisionRef",
        "labelAr": "مرجع قرار العودة للخدمة",
        "labelEn": "Return to service decision reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "MAR-WEATHER-DECISION",
    "titleAr": "سجل الظروف البحرية وقرار الاستمرار أو التأجيل",
    "titleEn": "Marine Conditions and Operating Decision Record",
    "department": "MARINE_OPERATIONS",
    "fields": [
      {
        "key": "tripRef",
        "labelAr": "مرجع الرحلة",
        "labelEn": "Trip reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "siteRef",
        "labelAr": "مرجع الموقع",
        "labelEn": "Site reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "conditionReadings",
        "labelAr": "القراءات المؤرخة ومصادرها",
        "labelEn": "Timestamped marine condition readings",
        "type": "TABLE",
        "required": true,
        "options": [
          "وقت القراءة",
          "العنصر",
          "القراءة",
          "الوحدة",
          "المصدر"
        ]
      },
      {
        "key": "operatingLimitsRef",
        "labelAr": "مرجع حدود التشغيل المعتمدة",
        "labelEn": "Approved operating limits reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "limitsComparison",
        "labelAr": "المقارنة بالحدود والنواقص",
        "labelEn": "Limits comparison and gaps",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "weatherAlternatives",
        "labelAr": "بدائل الاستمرار أو التأجيل",
        "labelEn": "Continue or postpone alternatives",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "competentDecisionRef",
        "labelAr": "مرجع قرار المختص المخول",
        "labelEn": "Authorized specialist decision reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "customerNoticeRef",
        "labelAr": "مرجع إشعار العميل بالقرار",
        "labelEn": "Customer decision notification reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "TRN-CENTER-ELIGIBILITY",
    "titleAr": "سجل أهلية مركز التدريب ومراجع التنسيق",
    "titleEn": "Training Center Eligibility and Coordination Register",
    "department": "TRAINING",
    "fields": [
      {
        "key": "centerRef",
        "labelAr": "مرجع مركز التدريب",
        "labelEn": "Training center reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "programScope",
        "labelAr": "البرنامج ونطاق التدريب",
        "labelEn": "Program and training scope",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "centerAccreditation",
        "labelAr": "الاعتماد والصلاحية ومراجع التحقق",
        "labelEn": "Accreditation validity and verification",
        "type": "TABLE",
        "required": true,
        "options": [
          "الاعتماد",
          "الجهة",
          "النطاق",
          "السريان",
          "الانتهاء",
          "مرجع التحقق"
        ]
      },
      {
        "key": "siteResources",
        "labelAr": "المواقع والموارد",
        "labelEn": "Sites and resources",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "instructorEligibilityRefs",
        "labelAr": "مراجع أهلية المدربين",
        "labelEn": "Instructor eligibility references",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "centerGaps",
        "labelAr": "نواقص أهلية المركز",
        "labelEn": "Center eligibility gaps",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "centerEligibilityDecisionRef",
        "labelAr": "مرجع قرار المراجعة والتجديد",
        "labelEn": "Center review and renewal decision reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "TRN-ELEARNING-PROGRESS",
    "titleAr": "سجل تقدم التعلم النظري والإلكتروني",
    "titleEn": "Theory and E Learning Progress Record",
    "department": "TRAINING",
    "fields": [
      {
        "key": "traineeRef",
        "labelAr": "مرجع المتدرب",
        "labelEn": "Trainee reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "courseCode",
        "labelAr": "رمز الدورة",
        "labelEn": "Course code",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "contentVersionRef",
        "labelAr": "مرجع نسخة المحتوى",
        "labelEn": "Content version reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "moduleProgress",
        "labelAr": "الوحدات والإكمال والمحاولات والنتائج",
        "labelEn": "Learning module progress and attempts",
        "type": "TABLE",
        "required": true,
        "options": [
          "الوحدة",
          "حالة الإكمال",
          "المحاولة",
          "النتيجة",
          "مرجع المصدر"
        ]
      },
      {
        "key": "learningAccessIssues",
        "labelAr": "مشكلات الوصول والدعم",
        "labelEn": "Learning access and support issues",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "progressVerificationRef",
        "labelAr": "مرجع تحقق المدرب أو منصة التعلم",
        "labelEn": "Instructor or LMS verification reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "learningNextAction",
        "labelAr": "الإجراء التالي ومسؤوله",
        "labelEn": "Next learning action and owner",
        "type": "TEXTAREA",
        "required": true
      }
    ]
  },
  {
    "code": "TRN-PRACTICAL-SESSION",
    "titleAr": "محضر جاهزية وتنفيذ جلسة تدريب عملي",
    "titleEn": "Practical Session Readiness and Delivery Record",
    "department": "TRAINING",
    "fields": [
      {
        "key": "courseCode",
        "labelAr": "رمز الدورة",
        "labelEn": "Course code",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "sessionRef",
        "labelAr": "مرجع الجلسة",
        "labelEn": "Session reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "sessionSiteTime",
        "labelAr": "الموقع والتوقيت",
        "labelEn": "Session site and time",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "sessionGroups",
        "labelAr": "المدربون والمجموعات والموارد",
        "labelEn": "Instructors groups and resources",
        "type": "TABLE",
        "required": true,
        "options": [
          "المجموعة",
          "المدرب",
          "المشاركون",
          "المورد",
          "مرجع الأهلية"
        ]
      },
      {
        "key": "sessionSafetyRefs",
        "labelAr": "مراجع متطلبات السلامة والرحلة عند الانطباق",
        "labelEn": "Safety and trip requirement references",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "sessionBlockers",
        "labelAr": "الموانع ومعالجتها",
        "labelEn": "Session blockers and handling",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "sessionDecisionRef",
        "labelAr": "مرجع قرار المختص بتنفيذ الجلسة",
        "labelEn": "Competent session decision reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "sessionEventsSkillsRefs",
        "labelAr": "الأحداث ومراجع سجلات المهارات",
        "labelEn": "Events and skills record references",
        "type": "TEXTAREA",
        "required": true
      }
    ]
  },
  {
    "code": "INV-SUPPLIER-QUALIFICATION",
    "titleAr": "سجل تأهيل المورد وتقييم أدائه ومستوى خدمته",
    "titleEn": "Supplier Qualification Performance and Service Level Register",
    "department": "INVENTORY_LOGISTICS",
    "fields": [
      {
        "key": "supplierRef",
        "labelAr": "مرجع المورد",
        "labelEn": "Supplier reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "supplyServiceScope",
        "labelAr": "الفئات ونطاق التوريد أو الخدمة",
        "labelEn": "Supply or service scope",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "qualificationEvidence",
        "labelAr": "وثائق الأهلية والتحقق والقيود",
        "labelEn": "Qualification verification and restrictions",
        "type": "TABLE",
        "required": true,
        "options": [
          "المتطلب",
          "الوثيقة",
          "مرجع التحقق",
          "الصلاحية",
          "القيد"
        ]
      },
      {
        "key": "supplierPerformance",
        "labelAr": "أداء التوريد ومستوى الخدمة",
        "labelEn": "Supply and service level performance",
        "type": "TABLE",
        "required": true,
        "options": [
          "المؤشر",
          "المتفق عليه",
          "النتيجة",
          "الفترة",
          "مرجع الدليل"
        ]
      },
      {
        "key": "supplierExceptions",
        "labelAr": "المخالفات والتعارضات والمعالجات",
        "labelEn": "Supplier exceptions and handling",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "supplierAcceptanceRef",
        "labelAr": "مرجع قرار القبول أو التجديد",
        "labelEn": "Supplier acceptance or renewal reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "nextSupplierReviewDate",
        "labelAr": "موعد المراجعة القادمة",
        "labelEn": "Next supplier review date",
        "type": "DATE",
        "required": true
      }
    ]
  },
  {
    "code": "INV-QUOTE-COMPARISON",
    "titleAr": "محضر مقارنة عروض وتوصية ترسية",
    "titleEn": "Quotation Comparison and Award Recommendation",
    "department": "INVENTORY_LOGISTICS",
    "fields": [
      {
        "key": "purchaseRequestRef",
        "labelAr": "مرجع طلب الشراء",
        "labelEn": "Purchase request reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "quotationVersions",
        "labelAr": "الموردون والعروض وإصداراتها",
        "labelEn": "Suppliers quotation versions",
        "type": "TABLE",
        "required": true,
        "options": [
          "المورد",
          "مرجع العرض",
          "الإصدار",
          "تاريخ العرض"
        ]
      },
      {
        "key": "comparisonLines",
        "labelAr": "المقارنة الفنية والمالية ومواعيد التوريد",
        "labelEn": "Technical commercial and delivery comparison",
        "type": "TABLE",
        "required": true,
        "options": [
          "المعيار",
          "الوزن",
          "المورد",
          "النتيجة",
          "التكلفة الكلية",
          "موعد التوريد",
          "مرجع الدليل"
        ]
      },
      {
        "key": "awardConflictReviewRef",
        "labelAr": "مرجع مراجعة تعارض المصالح",
        "labelEn": "Award conflict review reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "awardRecommendation",
        "labelAr": "توصية الترسية ومسوغاتها",
        "labelEn": "Award recommendation and grounds",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "awardDecisionRef",
        "labelAr": "مرجع قرار صاحب الصلاحية",
        "labelEn": "Authorized award decision reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "INV-PURCHASE-ORDER",
    "titleAr": "أمر شراء وإحالة توريد",
    "titleEn": "Purchase Order and Supply Handoff",
    "department": "INVENTORY_LOGISTICS",
    "fields": [
      {
        "key": "purchaseOrderRef",
        "labelAr": "مرجع أمر الشراء من مصدره المختص",
        "labelEn": "Canonical purchase order reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "awardApprovalRef",
        "labelAr": "مرجع الترسية والاعتماد",
        "labelEn": "Award and approval reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "supplierRef",
        "labelAr": "مرجع المورد",
        "labelEn": "Supplier reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "purchaseOrderLines",
        "labelAr": "البنود والكميات والأسعار",
        "labelEn": "Purchase order lines",
        "type": "TABLE",
        "required": true,
        "options": [
          "الصنف",
          "المواصفة",
          "الوحدة",
          "الكمية",
          "السعر",
          "العملة"
        ]
      },
      {
        "key": "deliveryTerms",
        "labelAr": "شروط ومواعيد التوريد",
        "labelEn": "Delivery terms and dates",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "receivingUnitRef",
        "labelAr": "الجهة المسؤولة عن الاستلام",
        "labelEn": "Receiving unit reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "specializedContractRef",
        "labelAr": "مرجع العقد عند الانطباق",
        "labelEn": "Specialized contract reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "purchaseIssueEvidenceRef",
        "labelAr": "مرجع إصدار الأمر وإحالته",
        "labelEn": "Purchase order issue and handoff reference",
        "type": "TEXT",
        "required": true
      }
    ]
  },
  {
    "code": "INV-FULFILLMENT-DELIVERY",
    "titleAr": "قائمة تجهيز وإرسال واستلام طلب",
    "titleEn": "Order Picking Dispatch and Delivery Checklist",
    "department": "INVENTORY_LOGISTICS",
    "fields": [
      {
        "key": "orderRef",
        "labelAr": "مرجع الطلب المعتمد",
        "labelEn": "Approved order reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "fulfillmentLines",
        "labelAr": "التجهيز والفحص والتعبئة",
        "labelEn": "Picking inspection and packing",
        "type": "TABLE",
        "required": true,
        "options": [
          "الصنف",
          "الرقم التسلسلي",
          "الكمية",
          "الحالة",
          "التعبئة",
          "مرجع الفحص"
        ]
      },
      {
        "key": "stockMovementRef",
        "labelAr": "مرجع حركة المخزون",
        "labelEn": "Stock movement reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "carrierTrackingRef",
        "labelAr": "مرجع الناقل والتتبع",
        "labelEn": "Carrier and tracking reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "deliveryDueDate",
        "labelAr": "موعد التسليم",
        "labelEn": "Delivery due date",
        "type": "DATE",
        "required": true
      },
      {
        "key": "deliveryEvidenceRef",
        "labelAr": "مرجع إثبات التسليم",
        "labelEn": "Delivery evidence reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "deliveryExceptions",
        "labelAr": "الفروق والإرجاع",
        "labelEn": "Delivery differences and returns",
        "type": "TEXTAREA",
        "required": true
      }
    ]
  },
  {
    "code": "FIN-RECEIVABLES-AGING",
    "titleAr": "كشف الذمم وأعمار المستحقات ومتابعة التحصيل",
    "titleEn": "Receivables Aging and Collection Followup",
    "department": "FINANCE",
    "fields": [
      {
        "key": "reportingPeriod",
        "labelAr": "فترة التقرير",
        "labelEn": "Reporting period",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "ledgerSnapshotRef",
        "labelAr": "مرجع كشف الدفتر المالي",
        "labelEn": "Canonical ledger snapshot reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "receivableLines",
        "labelAr": "المستحقات والتحصيل والمتبقي وأعمارها",
        "labelEn": "Receivables collection and aging",
        "type": "TABLE",
        "required": true,
        "options": [
          "العميل",
          "الفاتورة",
          "الاستحقاق",
          "العملة",
          "الأصلي",
          "المحصل",
          "المتبقي",
          "العمر",
          "مرجع المصدر"
        ]
      },
      {
        "key": "collectionDisputes",
        "labelAr": "النزاعات المؤثرة",
        "labelEn": "Collection disputes",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "collectionActions",
        "labelAr": "إجراءات التحصيل والمسؤول والموعد",
        "labelEn": "Collection actions owners and deadlines",
        "type": "TABLE",
        "required": true,
        "options": [
          "المستحق",
          "الإجراء",
          "المسؤول",
          "الموعد",
          "الحالة"
        ]
      }
    ]
  },
  {
    "code": "FIN-PROVIDER-SETTLEMENT",
    "titleAr": "كشف مستحقات مقدمي الخدمات وتسوية العمولات",
    "titleEn": "Service Provider Commission and Payable Settlement",
    "department": "FINANCE",
    "fields": [
      {
        "key": "providerRef",
        "labelAr": "مرجع مقدم الخدمة",
        "labelEn": "Service provider reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "contractVersionRef",
        "labelAr": "مرجع العقد وإصداره",
        "labelEn": "Contract version reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "settlementPeriod",
        "labelAr": "فترة التسوية",
        "labelEn": "Settlement period",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "providerSettlementLines",
        "labelAr": "الحجوزات والإيراد والعمولة والاسترداد وصافي المستحق",
        "labelEn": "Provider settlement lines",
        "type": "TABLE",
        "required": true,
        "options": [
          "الحجز",
          "الإيراد",
          "العمولة",
          "الرسوم",
          "الاسترداد",
          "صافي المستحق",
          "العملة",
          "مرجع المصدر"
        ]
      },
      {
        "key": "settlementDifferences",
        "labelAr": "الفروق وقرار معالجتها",
        "labelEn": "Settlement differences and handling",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "independentReviewRef",
        "labelAr": "مرجع المراجعة المستقلة",
        "labelEn": "Independent review reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "paymentExecutionRef",
        "labelAr": "مرجع التنفيذ من المسار المالي",
        "labelEn": "Canonical payment execution reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "FIN-OBLIGATION-RETURN-REGISTER",
    "titleAr": "سجل الالتزامات المالية ومراجعة الإقرارات",
    "titleEn": "Financial Obligation and Return Review Register",
    "department": "FINANCE",
    "fields": [
      {
        "key": "obligationType",
        "labelAr": "نوع الالتزام",
        "labelEn": "Obligation type",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "applicabilityDecisionRef",
        "labelAr": "مرجع قرار الانطباق من المختص",
        "labelEn": "Specialist applicability decision reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "obligationPeriod",
        "labelAr": "الفترة محل الالتزام",
        "labelEn": "Obligation period",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "obligationDueDate",
        "labelAr": "موعد الالتزام",
        "labelEn": "Obligation due date",
        "type": "DATE",
        "required": true
      },
      {
        "key": "obligationSourcesReconciliation",
        "labelAr": "مصادر البيانات ومطابقتها",
        "labelEn": "Source data reconciliation",
        "type": "TABLE",
        "required": true,
        "options": [
          "البيان",
          "المصدر",
          "الفترة",
          "نتيجة المطابقة",
          "مرجع الدليل"
        ]
      },
      {
        "key": "specialistReviewRef",
        "labelAr": "مرجع مراجعة المختص",
        "labelEn": "Specialist review reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "filingReference",
        "labelAr": "مرجع التقديم عند صدوره",
        "labelEn": "Filing reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "paymentExecutionRef",
        "labelAr": "مرجع السداد عند تنفيذه",
        "labelEn": "Payment execution reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "obligationFollowup",
        "labelAr": "الملاحظات والمتابعة",
        "labelEn": "Obligation followup",
        "type": "TEXTAREA",
        "required": true
      }
    ]
  },
  {
    "code": "FIN-CASH-COMMITMENT-SCHEDULE",
    "titleAr": "كشف السيولة والالتزامات وجدول المدفوعات",
    "titleEn": "Cash Availability Commitments and Payment Schedule",
    "department": "FINANCE",
    "fields": [
      {
        "key": "cashAsOfDate",
        "labelAr": "تاريخ الرصيد",
        "labelEn": "Cash balance date",
        "type": "DATE",
        "required": true
      },
      {
        "key": "restrictedAccountRef",
        "labelAr": "مرجع الحساب المقيد",
        "labelEn": "Restricted account reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "currency",
        "labelAr": "العملة",
        "labelEn": "Currency",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "availableCash",
        "labelAr": "السيولة المتاحة من المصدر",
        "labelEn": "Source available cash",
        "type": "NUMBER",
        "required": true
      },
      {
        "key": "commitmentSchedule",
        "labelAr": "الالتزامات والاستحقاقات وأولويات القرار",
        "labelEn": "Commitments due dates and priorities",
        "type": "TABLE",
        "required": true,
        "options": [
          "الالتزام",
          "المبلغ",
          "الاستحقاق",
          "الأولوية",
          "مرجع الاعتماد",
          "مرجع التنفيذ"
        ]
      },
      {
        "key": "cashShortfallBasis",
        "labelAr": "العجز المتوقع وأساسه",
        "labelEn": "Expected shortfall and basis",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "treasuryReviewRef",
        "labelAr": "مرجع مراجعة الخزينة",
        "labelEn": "Treasury review reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "SAF-RISK-REGISTER",
    "titleAr": "سجل المخاطر ومعالجتها وقبول المتبقي",
    "titleEn": "Risk Treatment and Residual Acceptance Register",
    "department": "SAFETY_COMPLIANCE_RISK",
    "fields": [
      {
        "key": "riskScope",
        "labelAr": "نطاق المخاطر والأنشطة",
        "labelEn": "Risk and activity scope",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "riskRegister",
        "labelAr": "المخاطر والتقدير والمعالجة والمتبقي",
        "labelEn": "Risk treatment and residual register",
        "type": "TABLE",
        "required": true,
        "options": [
          "معرف الخطر",
          "النشاط أو الموقع",
          "التقدير",
          "الضوابط",
          "المالك",
          "موعد المعالجة",
          "الخطر المتبقي",
          "مرجع الدليل"
        ]
      },
      {
        "key": "riskAcceptanceDecisionRef",
        "labelAr": "مرجع قبول المتبقي من صاحب الصلاحية",
        "labelEn": "Authorized residual risk acceptance reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "riskReviewDate",
        "labelAr": "موعد المراجعة القادمة",
        "labelEn": "Next risk review date",
        "type": "DATE",
        "required": true
      },
      {
        "key": "correctiveActionRefs",
        "labelAr": "مراجع الإجراءات التصحيحية",
        "labelEn": "Corrective action references",
        "type": "TEXTAREA",
        "required": true
      }
    ]
  },
  {
    "code": "SAF-OPERATING-CONTROL-MATRIX",
    "titleAr": "مصفوفة ضوابط التشغيل والاستثناءات",
    "titleEn": "Operating Control and Exception Matrix",
    "department": "SAFETY_COMPLIANCE_RISK",
    "fields": [
      {
        "key": "requirementScopeRef",
        "labelAr": "مرجع نطاق المتطلبات",
        "labelEn": "Requirement scope reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "operatingControlMatrix",
        "labelAr": "المتطلبات والضوابط والتنفيذ وقبولها",
        "labelEn": "Requirements controls execution and acceptance",
        "type": "TABLE",
        "required": true,
        "options": [
          "المتطلب وإصداره",
          "الانطباق",
          "الضابط",
          "المسؤول",
          "بند الفحص",
          "دليل القبول"
        ]
      },
      {
        "key": "requirementChangeImpact",
        "labelAr": "أثر تحديث المتطلبات",
        "labelEn": "Requirement change impact",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "operatingExceptions",
        "labelAr": "الاستثناءات ومدتها ومراجع قرارها",
        "labelEn": "Operating exceptions and decision references",
        "type": "TABLE",
        "required": true,
        "options": [
          "الاستثناء",
          "المسوغ",
          "المدة",
          "مرجع القرار"
        ]
      },
      {
        "key": "controlReviewRef",
        "labelAr": "مرجع مراجعة الضوابط",
        "labelEn": "Control review reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "SAF-EMERGENCY-DRILL",
    "titleAr": "محضر تمرين طوارئ ودروس مستفادة",
    "titleEn": "Emergency Drill and Lessons Learned Record",
    "department": "SAFETY_COMPLIANCE_RISK",
    "fields": [
      {
        "key": "emergencyPlanVersionRef",
        "labelAr": "مرجع خطة الطوارئ وإصدارها",
        "labelEn": "Emergency plan version reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "drillScenarioSite",
        "labelAr": "السيناريو والموقع",
        "labelEn": "Drill scenario and site",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "drillDate",
        "labelAr": "تاريخ التمرين",
        "labelEn": "Drill date",
        "type": "DATE",
        "required": true
      },
      {
        "key": "drillParticipants",
        "labelAr": "المشاركون والأدوار",
        "labelEn": "Drill participants and roles",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "drillTimeline",
        "labelAr": "التسلسل والأزمنة والنتائج",
        "labelEn": "Drill timeline and results",
        "type": "TABLE",
        "required": true,
        "options": [
          "المرحلة",
          "الوقت المستهدف",
          "الوقت الفعلي",
          "النتيجة",
          "مرجع الدليل"
        ]
      },
      {
        "key": "drillLessonsActions",
        "labelAr": "الدروس والإجراءات ومسؤولوها",
        "labelEn": "Lessons actions and owners",
        "type": "TABLE",
        "required": true,
        "options": [
          "الدرس",
          "الإجراء",
          "المالك",
          "الموعد",
          "مرجع التحقق"
        ]
      },
      {
        "key": "drillVerificationRef",
        "labelAr": "مرجع مراجعة التمرين وإعادته عند الحاجة",
        "labelEn": "Drill review and repeat reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "SAF-ENVIRONMENTAL-RECORD",
    "titleAr": "سجل الأثر البيئي والالتزام التشغيلي",
    "titleEn": "Environmental Impact and Operating Compliance Record",
    "department": "SAFETY_COMPLIANCE_RISK",
    "fields": [
      {
        "key": "activitySitePeriod",
        "labelAr": "النشاط والموقع والفترة",
        "labelEn": "Activity site and period",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "environmentApplicabilityRef",
        "labelAr": "مرجع الانطباق من المختص",
        "labelEn": "Specialist environmental applicability reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "impactReadings",
        "labelAr": "الأثر ومصدر الرصد ونتيجته",
        "labelEn": "Impact monitoring and results",
        "type": "TABLE",
        "required": true,
        "options": [
          "نوع الأثر",
          "وقت الرصد",
          "النتيجة",
          "الوحدة",
          "المصدر",
          "مرجع الانطباق"
        ]
      },
      {
        "key": "environmentExceptions",
        "labelAr": "المخالفات والإحالات",
        "labelEn": "Environmental exceptions and referrals",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "environmentActions",
        "labelAr": "المعالجات والأدلة ومراجعة المختص",
        "labelEn": "Environmental actions evidence and review",
        "type": "TEXTAREA",
        "required": true
      }
    ]
  },
  {
    "code": "CEX-MEMBERSHIP-COMMUNITY",
    "titleAr": "سجل دورة العضوية وطلبات المجتمع",
    "titleEn": "Membership Lifecycle and Community Request Record",
    "department": "CUSTOMER_EXPERIENCE",
    "fields": [
      {
        "key": "memberRef",
        "labelAr": "مرجع العضو",
        "labelEn": "Member reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "membershipVersionRef",
        "labelAr": "نوع العضوية وإصدار مزاياها",
        "labelEn": "Membership type and benefit version",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "membershipStartDate",
        "labelAr": "بداية السريان",
        "labelEn": "Membership start date",
        "type": "DATE",
        "required": true
      },
      {
        "key": "membershipEndDate",
        "labelAr": "انتهاء السريان",
        "labelEn": "Membership end date",
        "type": "DATE",
        "required": true
      },
      {
        "key": "memberVerificationRef",
        "labelAr": "مرجع التحقق في سجل العضوية",
        "labelEn": "Membership verification reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "membershipRequestType",
        "labelAr": "نوع الطلب أو بلاغ المجتمع",
        "labelEn": "Membership request or community report type",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "membershipCaseDetails",
        "labelAr": "تفاصيل التجديد أو التعليق أو البلاغ",
        "labelEn": "Membership case details",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "membershipDecisionRef",
        "labelAr": "مرجع قرار المخول",
        "labelEn": "Authorized membership decision reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "memberNoticeSettlementRefs",
        "labelAr": "مراجع الإشعار والتسوية عند انطباقها",
        "labelEn": "Notification and settlement references",
        "type": "TEXTAREA",
        "required": true
      }
    ]
  },
  {
    "code": "MKT-CREATIVE-PRODUCTION",
    "titleAr": "موجز إنتاج إبداعي وقبول الأصول",
    "titleEn": "Creative Production Brief and Asset Acceptance",
    "department": "MARKETING_GROWTH",
    "fields": [
      {
        "key": "campaignContentRef",
        "labelAr": "مرجع الحملة والمحتوى",
        "labelEn": "Campaign and content reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "creativeAudience",
        "labelAr": "الجمهور والغرض",
        "labelEn": "Audience and purpose",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "brandIdentityVersionRef",
        "labelAr": "مرجع الهوية وإصدارها",
        "labelEn": "Brand identity version reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "creativeSpecifications",
        "labelAr": "المقاسات والصيغ ومتطلبات الإتاحة",
        "labelEn": "Creative format and accessibility specifications",
        "type": "TABLE",
        "required": true,
        "options": [
          "الأصل",
          "القناة",
          "المقاس",
          "الصيغة",
          "متطلب الإتاحة"
        ]
      },
      {
        "key": "creativeRightsRef",
        "labelAr": "مرجع حقوق الأصول",
        "labelEn": "Creative rights reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "creativeScheduleVersions",
        "labelAr": "الجدول والنسخ وملفات المصدر",
        "labelEn": "Schedule versions and source files",
        "type": "TABLE",
        "required": true,
        "options": [
          "المخرج",
          "الموعد",
          "الإصدار",
          "مرجع الملف الأصلي",
          "مرجع الملف النهائي"
        ]
      },
      {
        "key": "creativeAcceptanceRef",
        "labelAr": "مرجع قبول الأصول",
        "labelEn": "Creative acceptance reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "MKT-SALES-PARTNERSHIP",
    "titleAr": "سجل فرص المبيعات والعروض وتسليم الشراكة",
    "titleEn": "Sales Opportunity Offer and Partnership Handoff Register",
    "department": "MARKETING_GROWTH",
    "fields": [
      {
        "key": "opportunitySource",
        "labelAr": "مصدر الفرصة",
        "labelEn": "Opportunity source",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "counterpartyRef",
        "labelAr": "مرجع الجهة",
        "labelEn": "Counterparty reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "serviceOpportunityScope",
        "labelAr": "الخدمة والقدرة التشغيلية",
        "labelEn": "Service and operating capacity",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "opportunityQualification",
        "labelAr": "نتيجة تأهيل الفرصة",
        "labelEn": "Opportunity qualification",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "opportunityStage",
        "labelAr": "مرحلة الفرصة",
        "labelEn": "Opportunity stage",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "offerVersionRegister",
        "labelAr": "العروض والأسعار ومراجع مراجعتها",
        "labelEn": "Offer versions prices and review references",
        "type": "TABLE",
        "required": true,
        "options": [
          "العرض",
          "الإصدار",
          "السعر",
          "العملة",
          "مرجع المراجعة"
        ]
      },
      {
        "key": "negotiationDecisionRef",
        "labelAr": "مرجع قرار التفاوض",
        "labelEn": "Negotiation decision reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "specializedContractRef",
        "labelAr": "مرجع العقد في مكتبته",
        "labelEn": "Specialized contract reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "operatingCommitmentHandoff",
        "labelAr": "الالتزامات وتسليم التشغيل",
        "labelEn": "Operating commitment handoff",
        "type": "TEXTAREA",
        "required": true
      }
    ]
  },
  {
    "code": "TEC-REQUIREMENT-ACCEPTANCE",
    "titleAr": "بطاقة متطلب ومعايير قبول وتسليم تكامل",
    "titleEn": "Product Requirement Acceptance and Integration Handoff",
    "department": "TECHNOLOGY_CYBERSECURITY",
    "fields": [
      {
        "key": "requirementOwnerRef",
        "labelAr": "مرجع المتطلب ومالكه",
        "labelEn": "Requirement and owner reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "problemPriority",
        "labelAr": "المشكلة والأولوية",
        "labelEn": "Problem and priority",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "businessRules",
        "labelAr": "المتطلب وقواعد العمل",
        "labelEn": "Requirement and business rules",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "acceptanceCriteria",
        "labelAr": "معايير القبول وأدلتها",
        "labelEn": "Acceptance criteria and evidence",
        "type": "TABLE",
        "required": true,
        "options": [
          "المعيار",
          "الحالة المتوقعة",
          "مرجع الدليل",
          "النتيجة"
        ]
      },
      {
        "key": "scopeApprovalRef",
        "labelAr": "مرجع اعتماد النطاق",
        "labelEn": "Scope approval reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "interfaceContractVersionRef",
        "labelAr": "مرجع عقد الواجهة وإصداره",
        "labelEn": "Interface contract version reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "implementationTestRefs",
        "labelAr": "مراجع التغيير والتنفيذ والاختبار",
        "labelEn": "Change implementation and test references",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "serviceOwnerAcceptanceRef",
        "labelAr": "مرجع قبول مالك الخدمة",
        "labelEn": "Service owner acceptance reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "TEC-TEST-DEFECT-REGISTER",
    "titleAr": "سجل حالات الاختبار والعيوب وقبول الإصدار",
    "titleEn": "Test Case Defect and Release Acceptance Register",
    "department": "TECHNOLOGY_CYBERSECURITY",
    "fields": [
      {
        "key": "releaseVersionRef",
        "labelAr": "مرجع الإصدار",
        "labelEn": "Release version reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "requirementsScopeRef",
        "labelAr": "مراجع المتطلبات ومعاييرها",
        "labelEn": "Requirement and criteria references",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "testEnvironmentDataRefs",
        "labelAr": "مراجع البيئة والبيانات المصرح بها",
        "labelEn": "Authorized test environment and data references",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "testCases",
        "labelAr": "حالات النجاح والمنع ونتائجها",
        "labelEn": "Positive and negative test cases",
        "type": "TABLE",
        "required": true,
        "options": [
          "الحالة",
          "المعيار",
          "المتوقع",
          "الفعلي",
          "النتيجة",
          "مرجع الدليل"
        ]
      },
      {
        "key": "defectRetestRegister",
        "labelAr": "العيوب والتصحيح وإعادة الاختبار",
        "labelEn": "Defects fixes and retests",
        "type": "TABLE",
        "required": true,
        "options": [
          "العيب",
          "الشدة",
          "المالك",
          "التصحيح",
          "إعادة الاختبار",
          "مرجع الدليل"
        ]
      },
      {
        "key": "releaseAcceptanceDecisionRef",
        "labelAr": "مرجع قرار قبول الإصدار",
        "labelEn": "Release acceptance decision reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "TEC-DATA-QUALITY-DICTIONARY",
    "titleAr": "قاموس البيانات والمؤشرات وسجل جودة البيانات",
    "titleEn": "Data Indicator Dictionary and Quality Register",
    "department": "TECHNOLOGY_CYBERSECURITY",
    "fields": [
      {
        "key": "dataScopeRef",
        "labelAr": "مرجع نطاق السجلات والتقارير",
        "labelEn": "Data and report scope reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "dataFieldDictionary",
        "labelAr": "تعريف الحقول ومصدر الحقيقة والوصول",
        "labelEn": "Data field dictionary source and access",
        "type": "TABLE",
        "required": true,
        "options": [
          "السجل",
          "الحقل",
          "التعريف",
          "النوع",
          "المصدر",
          "المالك",
          "تصنيف الحساسية",
          "نطاق الوصول"
        ]
      },
      {
        "key": "dataQualityRulesResults",
        "labelAr": "قواعد الجودة ونتائج الفحص",
        "labelEn": "Data quality rules and findings",
        "type": "TABLE",
        "required": true,
        "options": [
          "القاعدة",
          "النطاق",
          "النتيجة",
          "مرجع الدليل",
          "المعالجة"
        ]
      },
      {
        "key": "indicatorDefinitions",
        "labelAr": "تعريف المؤشرات والمقام والفترة",
        "labelEn": "Indicator definitions denominator and period",
        "type": "TABLE",
        "required": true,
        "options": [
          "المؤشر",
          "التعريف",
          "البسط",
          "المقام",
          "الفترة",
          "المصدر"
        ]
      },
      {
        "key": "dataChangeReviewRef",
        "labelAr": "مرجع مراجعة تغيير البيانات",
        "labelEn": "Data change review reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "TEC-AGENT-GOVERNANCE",
    "titleAr": "سجل حوكمة تشغيل الوكلاء والأتمتة",
    "titleEn": "Agent and Automation Operating Governance Register",
    "department": "TECHNOLOGY_CYBERSECURITY",
    "fields": [
      {
        "key": "agentRoleHierarchy",
        "labelAr": "هوية الوكيل ودوره وتبعيته",
        "labelEn": "Agent identity role and hierarchy",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "agentVersionScope",
        "labelAr": "الإصدار ونطاق التشغيل",
        "labelEn": "Agent version and operating scope",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "agentAuthorityLimits",
        "labelAr": "الصلاحيات وحدودها",
        "labelEn": "Agent authority limits",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "agentOperatingState",
        "labelAr": "حالة التشغيل وسبب التغيير ومرجع القرار",
        "labelEn": "Operating state change reason and decision reference",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "agentTaskAttempts",
        "labelAr": "المهام والمحاولات والأدلة",
        "labelEn": "Agent tasks attempts and evidence",
        "type": "TABLE",
        "required": true,
        "options": [
          "المهمة",
          "المحاولة",
          "الحالة",
          "مرجع المصدر",
          "مرجع المخرج"
        ]
      },
      {
        "key": "agentCostRecord",
        "labelAr": "الحجز والتقدير والتكلفة المعروفة",
        "labelEn": "Agent budget reservation estimate and known cost",
        "type": "TABLE",
        "required": true,
        "options": [
          "الفترة",
          "العملة",
          "المحجوز",
          "التقدير",
          "التكلفة المعلومة",
          "حالة المعلومية",
          "المصدر"
        ]
      },
      {
        "key": "agentOutputReviews",
        "labelAr": "المراجعات وقرار المخرج",
        "labelEn": "Agent output reviews and decision",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "agentIncidentRef",
        "labelAr": "مرجع حادث التشغيل عند وجوده",
        "labelEn": "Agent incident reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "FAC-DAILY-READINESS",
    "titleAr": "سجل جاهزية المرافق والخدمات العامة اليومي",
    "titleEn": "Daily Facility and General Service Readiness Record",
    "department": "FACILITIES_ASSETS_MAINTENANCE",
    "fields": [
      {
        "key": "facilitySiteRef",
        "labelAr": "مرجع الموقع",
        "labelEn": "Facility site reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "serviceShiftPeriod",
        "labelAr": "الخدمات والمناوبة والفترة",
        "labelEn": "Services shift and period",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "facilityReadinessChecks",
        "labelAr": "بنود الجاهزية والموارد والمفاتيح",
        "labelEn": "Facility readiness resources and keys",
        "type": "TABLE",
        "required": true,
        "options": [
          "الخدمة أو البند",
          "المعيار",
          "النتيجة",
          "المسؤول",
          "مرجع الدليل"
        ]
      },
      {
        "key": "facilityIssueRestoreLog",
        "labelAr": "الأعطال ووقت استعادة الخدمة",
        "labelEn": "Facility issues and restoration",
        "type": "TABLE",
        "required": true,
        "options": [
          "العطل",
          "مرجع البلاغ",
          "وقت التعطل",
          "وقت الاستعادة",
          "الحالة"
        ]
      },
      {
        "key": "shiftHandoverRef",
        "labelAr": "مرجع التسليم بين المناوبات",
        "labelEn": "Shift handover reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "facilityFollowupDecisionRef",
        "labelAr": "مرجع قرار المتابعة",
        "labelEn": "Facility followup decision reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "ADM-PROCEDURE-CARD",
    "titleAr": "بطاقة إجراء إداري وتسليم المسؤوليات",
    "titleEn": "Administrative Procedure and Responsibility Handoff Card",
    "department": "ADMIN_AFFAIRS_RECORDS",
    "fields": [
      {
        "key": "procedureCodeOwner",
        "labelAr": "رمز الإجراء ومالكه",
        "labelEn": "Procedure code and owner",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "procedureScope",
        "labelAr": "نطاق الإجراء",
        "labelEn": "Procedure scope",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "procedureInputs",
        "labelAr": "مدخلات الإجراء ومصادرها",
        "labelEn": "Procedure inputs and sources",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "procedureStepsRoles",
        "labelAr": "الخطوات والأدوار ونقاط التسليم",
        "labelEn": "Procedure steps roles and handoffs",
        "type": "TABLE",
        "required": true,
        "options": [
          "الخطوة",
          "المسؤول",
          "المدخل",
          "المخرج",
          "النموذج",
          "المدة",
          "مرجع التسلم"
        ]
      },
      {
        "key": "procedureAcceptanceExceptions",
        "labelAr": "معيار القبول والاستثناءات",
        "labelEn": "Procedure acceptance criteria and exceptions",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "procedureVersionRef",
        "labelAr": "الإصدار وتاريخ سريانه",
        "labelEn": "Procedure version and effective date",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "procedureApprovalRef",
        "labelAr": "مرجع اعتماد الإجراء",
        "labelEn": "Procedure approval reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "EXE-INITIATIVE-CHANGE",
    "titleAr": "ميثاق مبادرة وتغيير مؤسسي وقياس منافع",
    "titleEn": "Initiative Change Charter and Benefit Review",
    "department": "EXECUTIVE_GOVERNANCE",
    "fields": [
      {
        "key": "initiativeSponsorRef",
        "labelAr": "مرجع المبادرة والراعي",
        "labelEn": "Initiative and sponsor reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "initiativeBaselineGoal",
        "labelAr": "الهدف وخط الأساس",
        "labelEn": "Goal and baseline",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "initiativeScopeResources",
        "labelAr": "النطاق والموارد",
        "labelEn": "Scope and resources",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "initiativeMilestones",
        "labelAr": "المراحل والمسؤولون والمواعيد",
        "labelEn": "Milestones owners and dates",
        "type": "TABLE",
        "required": true,
        "options": [
          "المرحلة",
          "المخرج",
          "المسؤول",
          "الموعد",
          "مرجع الدليل"
        ]
      },
      {
        "key": "changeImpactRisks",
        "labelAr": "أثر التغيير والمخاطر",
        "labelEn": "Change impact and risks",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "initiativeChangeRequests",
        "labelAr": "طلبات تغيير المبادرة وقراراتها",
        "labelEn": "Initiative change requests and decisions",
        "type": "TABLE",
        "required": true,
        "options": [
          "التغيير",
          "المسوغ",
          "الأثر",
          "مرجع القرار"
        ]
      },
      {
        "key": "benefitMeasures",
        "labelAr": "نتائج قياس المنفعة",
        "labelEn": "Benefit measurement results",
        "type": "TABLE",
        "required": true,
        "options": [
          "المؤشر",
          "خط الأساس",
          "النتيجة",
          "الفترة",
          "المصدر"
        ]
      },
      {
        "key": "initiativeClosureHandoffRef",
        "labelAr": "مرجع التسليم وقرار الإقفال",
        "labelEn": "Initiative handoff and closure reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "LEG-REGULATORY-IMPACT",
    "titleAr": "سجل التشريعات وتقييم أثر الامتثال القانوني",
    "titleEn": "Legislation and Legal Compliance Impact Register",
    "department": "LEGAL_CONTRACTS_INSURANCE",
    "fields": [
      {
        "key": "legislationSourceVersion",
        "labelAr": "المصدر وإصداره وتاريخ الاطلاع",
        "labelEn": "Source version and retrieval date",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "legislationChange",
        "labelAr": "التغيير محل الدراسة",
        "labelEn": "Legislative change under review",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "qualifiedApplicabilityRef",
        "labelAr": "مرجع رأي الانطباق من المختص",
        "labelEn": "Qualified applicability opinion reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "affectedProcedures",
        "labelAr": "الإجراءات المتأثرة وملاكها",
        "labelEn": "Affected procedures and owners",
        "type": "TABLE",
        "required": true,
        "options": [
          "الإجراء",
          "المالك",
          "الأثر",
          "الفجوة",
          "موعد المعالجة",
          "مرجع الدليل"
        ]
      },
      {
        "key": "legalExceptionActions",
        "labelAr": "الملاحظات والاستثناءات وخطة معالجتها",
        "labelEn": "Legal exceptions and handling plan",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "legalComplianceReviewRef",
        "labelAr": "مرجع قرار المراجعة المخولة",
        "labelEn": "Authorized legal compliance review reference",
        "type": "TEXT",
        "required": false
      }
    ]
  },
  {
    "code": "LEG-PRIVACY-IP-REQUEST",
    "titleAr": "سجل طلبات الخصوصية وحقوق الملكية الفكرية",
    "titleEn": "Privacy and Intellectual Property Request Register",
    "department": "LEGAL_CONTRACTS_INSURANCE",
    "fields": [
      {
        "key": "rightsRequestType",
        "labelAr": "نوع طلب الخصوصية أو الملكية الفكرية",
        "labelEn": "Privacy or intellectual property request type",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "restrictedRequesterRef",
        "labelAr": "مرجع صاحب الطلب في السجل المقيد",
        "labelEn": "Restricted requester reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "rightsObjectScope",
        "labelAr": "الأصل أو البيانات ونطاق الطلب",
        "labelEn": "Asset data and request scope",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "capacityVerificationRef",
        "labelAr": "مرجع التحقق من الصفة",
        "labelEn": "Capacity verification reference",
        "type": "TEXT",
        "required": false
      },
      {
        "key": "qualifiedHandlingBasisRef",
        "labelAr": "مرجع أساس المعالجة ومراجعة المختص",
        "labelEn": "Qualified handling basis reference",
        "type": "TEXT",
        "required": true
      },
      {
        "key": "rightsRequestDueDate",
        "labelAr": "أجل معالجة الطلب",
        "labelEn": "Rights request due date",
        "type": "DATE",
        "required": true
      },
      {
        "key": "rightsHandlingEvidence",
        "labelAr": "الإجراء وإشعار صاحب الطلب وأدلته",
        "labelEn": "Handling notification and evidence",
        "type": "TEXTAREA",
        "required": true
      },
      {
        "key": "rightsClosureDecisionRef",
        "labelAr": "مرجع قرار الإقفال",
        "labelEn": "Rights request closure decision reference",
        "type": "TEXT",
        "required": false
      }
    ]
  }
];

const commonFields: DocumentFieldDefinition[] = [
  {
    "key": "recordDate",
    "labelAr": "تاريخ المحضر أو الطلب",
    "labelEn": "Record or request date",
    "type": "DATE",
    "required": true
  },
  {
    "key": "sourceRecordRef",
    "labelAr": "مرجع السجل الأصلي المرتبط بالإجراء",
    "labelEn": "Related domain record reference",
    "type": "TEXT",
    "required": true
  },
  {
    "key": "responsibleUnit",
    "labelAr": "الجهة أو المسؤول المكلف بالمتابعة",
    "labelEn": "Responsible unit or assigned officer",
    "type": "TEXT",
    "required": true
  },
  {
    "key": "supportingEvidence",
    "labelAr": "مراجع الأدلة والمرفقات المحفوظة",
    "labelEn": "Stored evidence and attachment references",
    "type": "TEXTAREA",
    "required": false
  },
  {
    "key": "followupDueDate",
    "labelAr": "موعد المتابعة عند الانطباق",
    "labelEn": "Followup due date when applicable",
    "type": "DATE",
    "required": false
  },
  {
    "key": "retentionPolicyRef",
    "labelAr": "مرجع سياسة الاحتفاظ أو تصنيف الحفظ",
    "labelEn": "Retention policy or filing classification reference",
    "type": "TEXT",
    "required": false
  }
];

export const SECTION_FORM_COVERAGE: Array<{code:string;department:DocumentDepartment;titleAr:string;templateCodes:string[]}> = [
  {
    "code": "HR-01",
    "department": "HR",
    "titleAr": "تخطيط القوى العاملة والتوظيف",
    "templateCodes": [
      "HR-STAFFING-NEED",
      "HR-JOB-DESCRIPTION",
      "HR-APPOINTMENT-RECORD",
      "HR-RECRUITMENT-REVIEW"
    ]
  },
  {
    "code": "HR-02",
    "department": "HR",
    "titleAr": "شؤون الموظفين والعقود",
    "templateCodes": [
      "HR-EMPLOYEE-REPORT",
      "HR-EMPLOYEE-FILE-INDEX",
      "HR-APPOINTMENT-RECORD",
      "HR-COMMENCEMENT",
      "HR-CONTRACT-AMENDMENT-REQUEST",
      "HR-OFFBOARDING-NOTICE",
      "HR-FINAL-SETTLEMENT",
      "HR-ASSET-CLEARANCE",
      "HR-ACCESS-REVOCATION",
      "HR-FILE-CLOSURE",
      "LEG-CONTRACT-REQUEST",
      "LEG-SIGNED-VERSION-INDEX",
      "HR-TRANSFER-ASSIGNMENT"
    ]
  },
  {
    "code": "HR-03",
    "department": "HR",
    "titleAr": "الرواتب والمزايا",
    "templateCodes": [
      "HR-COMPENSATION-MEMO",
      "HR-PAYROLL-HANDOFF",
      "FIN-PAYROLL-RECEIPT",
      "HR-ATTENDANCE-SUMMARY"
    ]
  },
  {
    "code": "HR-04",
    "department": "HR",
    "titleAr": "الأداء والتطوير والتدريب الداخلي",
    "templateCodes": [
      "HR-PERFORMANCE-REVIEW",
      "HR-JOB-DESCRIPTION",
      "TRN-ATTENDANCE-RECORD",
      "TRN-ASSESSMENT",
      "HR-DEVELOPMENT-PLAN"
    ]
  },
  {
    "code": "HR-05",
    "department": "HR",
    "titleAr": "الحضور والإجازات",
    "templateCodes": [
      "HR-ATTENDANCE-SUMMARY",
      "HR-LEAVE-REQUEST",
      "HR-LEAVE-RETURN",
      "HR-PAYROLL-HANDOFF"
    ]
  },
  {
    "code": "HR-06",
    "department": "HR",
    "titleAr": "الاعتمادات والمؤهلات",
    "templateCodes": [
      "HR-EMPLOYEE-FILE-INDEX",
      "TRN-INSTRUCTOR-ELIGIBILITY",
      "HR-CREDENTIAL-REGISTER"
    ]
  },
  {
    "code": "HR-07",
    "department": "HR",
    "titleAr": "علاقات الموظفين",
    "templateCodes": [
      "HR-INVESTIGATION-RECORD",
      "HR-DISCIPLINARY-REFERRAL",
      "HR-GRIEVANCE-RECORD",
      "HR-OFFBOARDING-NOTICE"
    ]
  },
  {
    "code": "HR-08",
    "department": "HR",
    "titleAr": "التكليفات والنقل بين المراكز",
    "templateCodes": [
      "HR-ASSET-CLEARANCE",
      "HR-ACCESS-REVOCATION",
      "HR-COMMENCEMENT",
      "HR-TRANSFER-ASSIGNMENT"
    ]
  },
  {
    "code": "MAR-01",
    "department": "MARINE_OPERATIONS",
    "titleAr": "تخطيط الرحلات وجدولة التشغيل",
    "templateCodes": [
      "MAR-OPERATING-ORDER",
      "MAR-PARTICIPANT-MANIFEST",
      "MAR-CREW-MANIFEST",
      "MAR-RESOURCE-SCHEDULE"
    ]
  },
  {
    "code": "MAR-02",
    "department": "MARINE_OPERATIONS",
    "titleAr": "تنسيق تشغيل الغوص والأنشطة البحرية",
    "templateCodes": [
      "MAR-TRIP-CHECKLIST",
      "MAR-DIVE-LOG",
      "MAR-PARTICIPANT-READINESS",
      "MAR-SAFETY-BRIEFING"
    ]
  },
  {
    "code": "MAR-03",
    "department": "MARINE_OPERATIONS",
    "titleAr": "تنسيق الوسائط البحرية والأطقم",
    "templateCodes": [
      "MAR-CREW-MANIFEST",
      "MAR-PARTICIPANT-MANIFEST",
      "MAR-OPERATING-ORDER",
      "MAR-RESOURCE-SCHEDULE"
    ]
  },
  {
    "code": "MAR-04",
    "department": "MARINE_OPERATIONS",
    "titleAr": "المواقع والمراسي والدعم التشغيلي",
    "templateCodes": [
      "MAR-PERMIT-INDEX",
      "MAR-OPERATING-ORDER",
      "MAR-SITE-BERTH-READINESS"
    ]
  },
  {
    "code": "MAR-05",
    "department": "MARINE_OPERATIONS",
    "titleAr": "الجاهزية الفنية والصيانة",
    "templateCodes": [
      "MAR-TRIP-CHECKLIST",
      "INV-CUSTODY-RECORD",
      "SAF-INSPECTION-AUDIT",
      "MAR-VESSEL-MAINTENANCE"
    ]
  },
  {
    "code": "MAR-06",
    "department": "MARINE_OPERATIONS",
    "titleAr": "الوثائق والتصاريح التشغيلية",
    "templateCodes": [
      "MAR-PERMIT-INDEX",
      "MAR-PARTICIPANT-READINESS",
      "MAR-SAFETY-BRIEFING"
    ]
  },
  {
    "code": "MAR-07",
    "department": "MARINE_OPERATIONS",
    "titleAr": "متابعة الرحلات والظروف البحرية",
    "templateCodes": [
      "MAR-TRIP-REPORT",
      "MAR-RETURN-CLOSURE",
      "MAR-SETTLEMENT-HANDOFF",
      "MAR-PARTICIPANT-MANIFEST",
      "MAR-WEATHER-DECISION"
    ]
  },
  {
    "code": "TRN-01",
    "department": "TRAINING",
    "titleAr": "التخطيط والبرامج التدريبية",
    "templateCodes": [
      "TRN-TRAINING-PLAN",
      "TRN-PROGRAM-REVIEW",
      "RND-ADOPTION-HANDOFF"
    ]
  },
  {
    "code": "TRN-02",
    "department": "TRAINING",
    "titleAr": "القبول وشؤون المتدربين",
    "templateCodes": [
      "TRN-ENROLLMENT",
      "TRN-TRAINEE-PREREQUISITES",
      "TRN-TRAINEE-ACKNOWLEDGEMENT"
    ]
  },
  {
    "code": "TRN-03",
    "department": "TRAINING",
    "titleAr": "المدربون ومراكز التدريب",
    "templateCodes": [
      "TRN-INSTRUCTOR-ELIGIBILITY",
      "TRN-TRAINING-PLAN",
      "TRN-CENTER-ELIGIBILITY"
    ]
  },
  {
    "code": "TRN-04",
    "department": "TRAINING",
    "titleAr": "التدريب النظري والتعلم الإلكتروني",
    "templateCodes": [
      "TRN-TRAINING-PLAN",
      "TRN-ATTENDANCE-RECORD",
      "TRN-ASSESSMENT",
      "TRN-ELEARNING-PROGRESS"
    ]
  },
  {
    "code": "TRN-05",
    "department": "TRAINING",
    "titleAr": "التدريب العملي والتنسيق الميداني",
    "templateCodes": [
      "TRN-SKILLS-RECORD",
      "TRN-ATTENDANCE-RECORD",
      "MAR-PARTICIPANT-READINESS",
      "MAR-SAFETY-BRIEFING",
      "TRN-PRACTICAL-SESSION"
    ]
  },
  {
    "code": "TRN-06",
    "department": "TRAINING",
    "titleAr": "التقييم والجودة التدريبية",
    "templateCodes": [
      "TRN-COURSE-REPORT",
      "TRN-ASSESSMENT",
      "TRN-ASSESSMENT-APPEAL",
      "TRN-RESULT-REVIEW",
      "TRN-PROGRAM-REVIEW",
      "TRN-TRAINEE-ACKNOWLEDGEMENT"
    ]
  },
  {
    "code": "TRN-07",
    "department": "TRAINING",
    "titleAr": "السجلات والشهادات التدريبية",
    "templateCodes": [
      "TRN-CERTIFICATE-HANDOFF",
      "TRN-RESULT-REVIEW",
      "TRN-SKILLS-RECORD",
      "TRN-ATTENDANCE-RECORD"
    ]
  },
  {
    "code": "INV-01",
    "department": "INVENTORY_LOGISTICS",
    "titleAr": "تخطيط الاحتياج والمشتريات",
    "templateCodes": [
      "INV-PURCHASE-REQUEST",
      "FIN-BUDGET-REVIEW",
      "INV-QUOTE-COMPARISON",
      "INV-PURCHASE-ORDER"
    ]
  },
  {
    "code": "INV-02",
    "department": "INVENTORY_LOGISTICS",
    "titleAr": "الموردون والتوريد",
    "templateCodes": [
      "INV-RECEIPT-INSPECTION",
      "FIN-INVOICE-MATCH",
      "INV-SUPPLIER-QUALIFICATION",
      "INV-QUOTE-COMPARISON",
      "INV-PURCHASE-ORDER"
    ]
  },
  {
    "code": "INV-03",
    "department": "INVENTORY_LOGISTICS",
    "titleAr": "الاستلام والتخزين",
    "templateCodes": [
      "INV-RECEIPT-INSPECTION",
      "INV-ISSUE-RECORD",
      "INV-RETURN-RECORD",
      "INV-TRANSFER"
    ]
  },
  {
    "code": "INV-04",
    "department": "INVENTORY_LOGISTICS",
    "titleAr": "ضبط المخزون والجرد",
    "templateCodes": [
      "INV-STOCK-REPORT",
      "INV-STOCKTAKE",
      "INV-DAMAGE-DISPOSITION",
      "INV-TRANSFER"
    ]
  },
  {
    "code": "INV-05",
    "department": "INVENTORY_LOGISTICS",
    "titleAr": "تجهيز الطلبات واللوجستيات",
    "templateCodes": [
      "INV-ISSUE-RECORD",
      "INV-TRANSFER",
      "INV-RETURN-RECORD",
      "INV-FULFILLMENT-DELIVERY"
    ]
  },
  {
    "code": "INV-06",
    "department": "INVENTORY_LOGISTICS",
    "titleAr": "معدات التأجير والعهد",
    "templateCodes": [
      "INV-RENTAL-HANDOVER",
      "INV-RENTAL-RETURN",
      "INV-CUSTODY-RECORD",
      "INV-DAMAGE-DISPOSITION"
    ]
  },
  {
    "code": "FIN-01",
    "department": "FINANCE",
    "titleAr": "الحسابات العامة والتقارير",
    "templateCodes": [
      "FIN-TRANSACTION-REPORT",
      "FIN-PERIOD-CLOSE",
      "FIN-BANK-RECONCILIATION",
      "FIN-INVOICE-MATCH"
    ]
  },
  {
    "code": "FIN-02",
    "department": "FINANCE",
    "titleAr": "الإيرادات والتحصيل",
    "templateCodes": [
      "FIN-RECEIPT-VOUCHER",
      "FIN-PROVIDER-RECONCILIATION",
      "CEX-REFUND-HANDOFF",
      "FIN-RECEIVABLES-AGING"
    ]
  },
  {
    "code": "FIN-03",
    "department": "FINANCE",
    "titleAr": "الخزينة والمدفوعات",
    "templateCodes": [
      "FIN-PAYMENT-VOUCHER",
      "FIN-CLAIM-REVIEW",
      "FIN-PAYROLL-RECEIPT",
      "FIN-BANK-RECONCILIATION",
      "FIN-CASH-COMMITMENT-SCHEDULE"
    ]
  },
  {
    "code": "FIN-04",
    "department": "FINANCE",
    "titleAr": "تسويات المنصة ومقدمي الخدمات",
    "templateCodes": [
      "FIN-PROVIDER-RECONCILIATION",
      "FIN-BANK-RECONCILIATION",
      "MAR-SETTLEMENT-HANDOFF",
      "FIN-PROVIDER-SETTLEMENT"
    ]
  },
  {
    "code": "FIN-05",
    "department": "FINANCE",
    "titleAr": "الميزانية والتكاليف والتحليل",
    "templateCodes": [
      "FIN-BUDGET-REVIEW",
      "EXE-BUDGET-HANDOFF",
      "FIN-PERIOD-CLOSE"
    ]
  },
  {
    "code": "FIN-06",
    "department": "FINANCE",
    "titleAr": "الزكاة والضرائب والالتزام المالي",
    "templateCodes": [
      "FIN-INVOICE-MATCH",
      "FIN-PERIOD-CLOSE",
      "FIN-OBLIGATION-RETURN-REGISTER"
    ]
  },
  {
    "code": "SAF-01",
    "department": "SAFETY_COMPLIANCE_RISK",
    "titleAr": "إدارة المخاطر",
    "templateCodes": [
      "SAF-RISK-ASSESSMENT",
      "SAF-CAPA",
      "SAF-RISK-REGISTER"
    ]
  },
  {
    "code": "SAF-02",
    "department": "SAFETY_COMPLIANCE_RISK",
    "titleAr": "معايير السلامة وضوابط التشغيل",
    "templateCodes": [
      "SAF-COMPLIANCE-REGISTER",
      "SAF-RISK-ASSESSMENT",
      "SAF-INSPECTION-AUDIT",
      "SAF-OPERATING-CONTROL-MATRIX"
    ]
  },
  {
    "code": "SAF-03",
    "department": "SAFETY_COMPLIANCE_RISK",
    "titleAr": "مراجعة الجاهزية والتفتيش",
    "templateCodes": [
      "SAF-INSPECTION-AUDIT",
      "MAR-TRIP-CHECKLIST",
      "SAF-RISK-ASSESSMENT",
      "SAF-EFFECTIVENESS-CLOSE"
    ]
  },
  {
    "code": "SAF-04",
    "department": "SAFETY_COMPLIANCE_RISK",
    "titleAr": "الطوارئ والحوادث",
    "templateCodes": [
      "SAF-EMERGENCY-PLAN",
      "SAF-PLAN-BRIEFING",
      "SAF-INCIDENT",
      "SAF-INCIDENT-REPORT",
      "LEG-INSURANCE-CLAIM",
      "SAF-EMERGENCY-DRILL"
    ]
  },
  {
    "code": "SAF-05",
    "department": "SAFETY_COMPLIANCE_RISK",
    "titleAr": "الامتثال التشغيلي والبيئي",
    "templateCodes": [
      "SAF-COMPLIANCE-REGISTER",
      "SAF-INSPECTION-AUDIT",
      "SAF-ENVIRONMENTAL-RECORD"
    ]
  },
  {
    "code": "SAF-06",
    "department": "SAFETY_COMPLIANCE_RISK",
    "titleAr": "الإجراءات التصحيحية والتحسين",
    "templateCodes": [
      "SAF-CAPA",
      "SAF-EFFECTIVENESS-CLOSE",
      "SAF-INSPECTION-AUDIT"
    ]
  },
  {
    "code": "CX-01",
    "department": "CUSTOMER_EXPERIENCE",
    "titleAr": "الاستقبال والدعم",
    "templateCodes": [
      "CEX-SERVICE-REQUEST",
      "CEX-CASE-REPORT",
      "CEX-REFERRAL-ESCALATION",
      "CEX-CUSTOMER-NOTIFICATION"
    ]
  },
  {
    "code": "CX-02",
    "department": "CUSTOMER_EXPERIENCE",
    "titleAr": "متابعة الحجوزات والطلبات",
    "templateCodes": [
      "CEX-SERVICE-REQUEST",
      "CEX-CANCELLATION-REQUEST",
      "CEX-CUSTOMER-NOTIFICATION",
      "CEX-REFUND-HANDOFF"
    ]
  },
  {
    "code": "CX-03",
    "department": "CUSTOMER_EXPERIENCE",
    "titleAr": "الشكاوى وطلبات التعويض",
    "templateCodes": [
      "CEX-COMPLAINT",
      "CEX-RESOLUTION",
      "CEX-REFERRAL-ESCALATION",
      "CEX-REFUND-HANDOFF",
      "LEG-CLAIM-CLOSURE"
    ]
  },
  {
    "code": "CX-04",
    "department": "CUSTOMER_EXPERIENCE",
    "titleAr": "تجربة العميل وجودة الخدمة",
    "templateCodes": [
      "CEX-SATISFACTION-FOLLOWUP",
      "CEX-RESOLUTION",
      "CEX-CASE-REPORT",
      "SAF-CAPA"
    ]
  },
  {
    "code": "CX-05",
    "department": "CUSTOMER_EXPERIENCE",
    "titleAr": "المجتمع والعضويات",
    "templateCodes": [
      "CEX-SERVICE-REQUEST",
      "CEX-CUSTOMER-NOTIFICATION",
      "CEX-MEMBERSHIP-COMMUNITY"
    ]
  },
  {
    "code": "MKT-01",
    "department": "MARKETING_GROWTH",
    "titleAr": "الاستراتيجية والعلامة التجارية",
    "templateCodes": [
      "MKT-MARKETING-PLAN",
      "MKT-BRAND-IDENTITY-REGISTER",
      "MKT-CAMPAIGN-BRIEF"
    ]
  },
  {
    "code": "MKT-02",
    "department": "MARKETING_GROWTH",
    "titleAr": "المحتوى والتحرير",
    "templateCodes": [
      "MKT-CONTENT-CALENDAR",
      "MKT-CONTENT-APPROVAL",
      "MKT-CONTENT-RIGHTS"
    ]
  },
  {
    "code": "MKT-03",
    "department": "MARKETING_GROWTH",
    "titleAr": "التصميم والإنتاج الإبداعي",
    "templateCodes": [
      "MKT-CONTENT-RIGHTS",
      "MKT-CONTENT-APPROVAL",
      "MKT-BRAND-IDENTITY-REGISTER",
      "MKT-CREATIVE-PRODUCTION"
    ]
  },
  {
    "code": "MKT-04",
    "department": "MARKETING_GROWTH",
    "titleAr": "التواصل الاجتماعي وإدارة القنوات",
    "templateCodes": [
      "MKT-CONTENT-CALENDAR",
      "MKT-PUBLISH-ORDER",
      "MKT-PUBLICATION-EVIDENCE",
      "CEX-REFERRAL-ESCALATION"
    ]
  },
  {
    "code": "MKT-05",
    "department": "MARKETING_GROWTH",
    "titleAr": "الحملات الإعلانية واكتساب العملاء",
    "templateCodes": [
      "MKT-CAMPAIGN-BRIEF",
      "MKT-CAMPAIGN-REPORT",
      "MKT-SPEND-RECONCILIATION",
      "MKT-MARKETING-PLAN"
    ]
  },
  {
    "code": "MKT-06",
    "department": "MARKETING_GROWTH",
    "titleAr": "المبيعات والشراكات",
    "templateCodes": [
      "LEG-CONTRACT-REQUEST",
      "LEG-CONTRACT-REVIEW",
      "MKT-MARKETING-PLAN",
      "MKT-SALES-PARTNERSHIP"
    ]
  },
  {
    "code": "MKT-07",
    "department": "MARKETING_GROWTH",
    "titleAr": "التحليلات وتحسين النمو",
    "templateCodes": [
      "MKT-CAMPAIGN-REPORT",
      "MKT-SPEND-RECONCILIATION",
      "RND-EXPERIMENT-PLAN",
      "RND-EXPERIMENT-RESULTS"
    ]
  },
  {
    "code": "TECH-01",
    "department": "TECHNOLOGY_CYBERSECURITY",
    "titleAr": "إدارة المنتج وتحليل المتطلبات",
    "templateCodes": [
      "TEC-CHANGE-REQUEST",
      "TEC-SYSTEM-ASSET-REGISTER",
      "TEC-REQUIREMENT-ACCEPTANCE"
    ]
  },
  {
    "code": "TECH-02",
    "department": "TECHNOLOGY_CYBERSECURITY",
    "titleAr": "تطوير المنصة والتكاملات",
    "templateCodes": [
      "TEC-CHANGE-REQUEST",
      "TEC-RELEASE-RECORD",
      "TEC-INCIDENT-RESOLUTION",
      "TEC-REQUIREMENT-ACCEPTANCE"
    ]
  },
  {
    "code": "TECH-03",
    "department": "TECHNOLOGY_CYBERSECURITY",
    "titleAr": "ضمان الجودة والاختبار",
    "templateCodes": [
      "TEC-RELEASE-RECORD",
      "TEC-RESTORE-TEST",
      "TEC-INCIDENT-RESOLUTION",
      "TEC-TEST-DEFECT-REGISTER"
    ]
  },
  {
    "code": "TECH-04",
    "department": "TECHNOLOGY_CYBERSECURITY",
    "titleAr": "البنية التحتية والتشغيل والاستمرارية",
    "templateCodes": [
      "TEC-BACKUP-LOG",
      "TEC-RESTORE-TEST",
      "TEC-RELEASE-RECORD",
      "TEC-SYSTEM-ASSET-REGISTER"
    ]
  },
  {
    "code": "TECH-05",
    "department": "TECHNOLOGY_CYBERSECURITY",
    "titleAr": "الأمن السيبراني وإدارة الصلاحيات",
    "templateCodes": [
      "TEC-ACCESS-REQUEST",
      "TEC-ACCESS-MATRIX",
      "TEC-ACCESS-REVOCATION",
      "TEC-SECURITY-INCIDENT",
      "TEC-SECURITY-REPORT",
      "TEC-INCIDENT-RESOLUTION"
    ]
  },
  {
    "code": "TECH-06",
    "department": "TECHNOLOGY_CYBERSECURITY",
    "titleAr": "البيانات والتقارير",
    "templateCodes": [
      "TEC-SYSTEM-ASSET-REGISTER",
      "EXE-PERFORMANCE-CLOSURE",
      "TEC-DATA-QUALITY-DICTIONARY"
    ]
  },
  {
    "code": "TECH-07",
    "department": "TECHNOLOGY_CYBERSECURITY",
    "titleAr": "تشغيل الوكلاء والأتمتة",
    "templateCodes": [
      "TEC-CHANGE-REQUEST",
      "TEC-RELEASE-RECORD",
      "TEC-INCIDENT-RESOLUTION",
      "TEC-AGENT-GOVERNANCE"
    ]
  },
  {
    "code": "FAC-01",
    "department": "FACILITIES_ASSETS_MAINTENANCE",
    "titleAr": "تشغيل المرافق والمواقع",
    "templateCodes": [
      "FAC-ASSET-INSPECTION",
      "FAC-WORK-ORDER",
      "SAF-INSPECTION-AUDIT",
      "FAC-DAILY-READINESS"
    ]
  },
  {
    "code": "FAC-02",
    "department": "FACILITIES_ASSETS_MAINTENANCE",
    "titleAr": "صيانة المرافق والأصول البرية",
    "templateCodes": [
      "FAC-MAINTENANCE-REPORT",
      "FAC-WORK-ORDER",
      "FAC-PREVENTIVE-PLAN",
      "FAC-SPARE-PARTS-ISSUE",
      "FAC-WARRANTY-CONTRACT-INDEX",
      "FAC-WORK-ACCEPTANCE"
    ]
  },
  {
    "code": "FAC-03",
    "department": "FACILITIES_ASSETS_MAINTENANCE",
    "titleAr": "الأصول الثابتة والعهد",
    "templateCodes": [
      "FAC-ASSET-CARD",
      "FAC-ASSET-HANDOVER",
      "FAC-ASSET-INSPECTION",
      "FAC-ASSET-RETIREMENT",
      "INV-CUSTODY-RECORD"
    ]
  },
  {
    "code": "FAC-04",
    "department": "FACILITIES_ASSETS_MAINTENANCE",
    "titleAr": "الخدمات العامة",
    "templateCodes": [
      "FAC-WORK-ORDER",
      "FAC-WORK-ACCEPTANCE",
      "FAC-DAILY-READINESS"
    ]
  },
  {
    "code": "FAC-05",
    "department": "FACILITIES_ASSETS_MAINTENANCE",
    "titleAr": "متابعة موردي خدمات المرافق",
    "templateCodes": [
      "FAC-WARRANTY-CONTRACT-INDEX",
      "FAC-WORK-ACCEPTANCE",
      "INV-RECEIPT-INSPECTION",
      "INV-SUPPLIER-QUALIFICATION"
    ]
  },
  {
    "code": "ADM-01",
    "department": "ADMIN_AFFAIRS_RECORDS",
    "titleAr": "المراسلات والوارد والصادر",
    "templateCodes": [
      "ADM-INCOMING-CORRESPONDENCE",
      "ADM-OUTGOING-CORRESPONDENCE",
      "ADM-CORRESPONDENCE-REPORT",
      "ADM-REFERRAL-DELIVERY"
    ]
  },
  {
    "code": "ADM-02",
    "department": "ADMIN_AFFAIRS_RECORDS",
    "titleAr": "إدارة الوثائق والأرشفة",
    "templateCodes": [
      "ADM-DOCUMENT-INDEX",
      "ADM-RETENTION-ACCESS",
      "ADM-ARCHIVE-TRANSFER",
      "ADM-DISPOSAL-REQUEST",
      "ADM-REVISION-REGISTER"
    ]
  },
  {
    "code": "ADM-03",
    "department": "ADMIN_AFFAIRS_RECORDS",
    "titleAr": "النماذج والإجراءات الإدارية",
    "templateCodes": [
      "ADM-REVISION-REGISTER",
      "ADM-DOCUMENT-INDEX",
      "EXE-DEPARTMENT-CHARTER",
      "ADM-PROCEDURE-CARD"
    ]
  },
  {
    "code": "ADM-04",
    "department": "ADMIN_AFFAIRS_RECORDS",
    "titleAr": "التنسيق الإداري والاجتماعات",
    "templateCodes": [
      "ADM-MEETING-MINUTES",
      "ADM-REFERRAL-DELIVERY",
      "EXE-FOLLOWUP"
    ]
  },
  {
    "code": "EXE-01",
    "department": "EXECUTIVE_GOVERNANCE",
    "titleAr": "السكرتارية التنفيذية ومكتب الإدارة العليا",
    "templateCodes": [
      "EXE-DECISION-REPORT",
      "EXE-COMMITTEE-MINUTES",
      "ADM-MEETING-MINUTES",
      "EXE-PERFORMANCE-CLOSURE"
    ]
  },
  {
    "code": "EXE-02",
    "department": "EXECUTIVE_GOVERNANCE",
    "titleAr": "المتابعة الداخلية",
    "templateCodes": [
      "EXE-FOLLOWUP",
      "EXE-PERFORMANCE-CLOSURE",
      "EXE-DECISION-REPORT"
    ]
  },
  {
    "code": "EXE-03",
    "department": "EXECUTIVE_GOVERNANCE",
    "titleAr": "التخطيط المؤسسي والأداء",
    "templateCodes": [
      "EXE-STRATEGIC-PLAN",
      "EXE-PERFORMANCE-CLOSURE",
      "EXE-BUDGET-HANDOFF",
      "FIN-BUDGET-REVIEW"
    ]
  },
  {
    "code": "EXE-04",
    "department": "EXECUTIVE_GOVERNANCE",
    "titleAr": "الحوكمة والصلاحيات",
    "templateCodes": [
      "EXE-DECISION",
      "EXE-DELEGATION-MATRIX",
      "EXE-CONFLICT-DISCLOSURE",
      "EXE-COMMITTEE-CHARTER",
      "EXE-COMMITTEE-MINUTES",
      "EXE-DEPARTMENT-CHARTER"
    ]
  },
  {
    "code": "EXE-05",
    "department": "EXECUTIVE_GOVERNANCE",
    "titleAr": "المبادرات والتغيير المؤسسي",
    "templateCodes": [
      "EXE-STRATEGIC-PLAN",
      "EXE-FOLLOWUP",
      "RND-ADOPTION-HANDOFF",
      "EXE-INITIATIVE-CHANGE"
    ]
  },
  {
    "code": "RND-01",
    "department": "RND_MARKET_INTELLIGENCE",
    "titleAr": "بحوث السوق والفرص",
    "templateCodes": [
      "RND-RESEARCH-BRIEF",
      "RND-STUDY-REPORT",
      "RND-RESEARCH-PROPOSAL",
      "RND-DATA-SOURCE-PERMISSIONS"
    ]
  },
  {
    "code": "RND-02",
    "department": "RND_MARKET_INTELLIGENCE",
    "titleAr": "تطوير الخدمات والابتكار",
    "templateCodes": [
      "RND-RESEARCH-PROPOSAL",
      "RND-SCOPE-REVIEW",
      "RND-OUTPUT-IP-REGISTER",
      "RND-ADOPTION-HANDOFF",
      "RND-EXPERIMENT-PLAN"
    ]
  },
  {
    "code": "RND-03",
    "department": "RND_MARKET_INTELLIGENCE",
    "titleAr": "دراسات الجدوى وتقييم البدائل",
    "templateCodes": [
      "RND-FEASIBILITY",
      "RND-STUDY-REPORT",
      "RND-DATA-SOURCE-PERMISSIONS",
      "RND-SCOPE-REVIEW"
    ]
  },
  {
    "code": "RND-04",
    "department": "RND_MARKET_INTELLIGENCE",
    "titleAr": "التجارب والتحقق",
    "templateCodes": [
      "RND-EXPERIMENT-PLAN",
      "RND-EXPERIMENT-RESULTS",
      "RND-SCOPE-REVIEW",
      "RND-ADOPTION-HANDOFF"
    ]
  },
  {
    "code": "LEG-01",
    "department": "LEGAL_CONTRACTS_INSURANCE",
    "titleAr": "الاستشارات والتشريعات",
    "templateCodes": [
      "LEG-LEGAL-REPORT",
      "LEG-REVIEW-CHANGE-LOG",
      "LEG-REGULATORY-IMPACT"
    ]
  },
  {
    "code": "LEG-02",
    "department": "LEGAL_CONTRACTS_INSURANCE",
    "titleAr": "العقود والاتفاقيات",
    "templateCodes": [
      "LEG-CONTRACT-REQUEST",
      "LEG-CONTRACT-REVIEW",
      "LEG-PARTY-CAPACITY",
      "LEG-REVIEW-CHANGE-LOG",
      "LEG-SIGNED-VERSION-INDEX",
      "LEG-RENEWAL-REGISTER",
      "LEG-TERMINATION-HANDOFF"
    ]
  },
  {
    "code": "LEG-03",
    "department": "LEGAL_CONTRACTS_INSURANCE",
    "titleAr": "الحوكمة والامتثال القانوني",
    "templateCodes": [
      "LEG-REVIEW-CHANGE-LOG",
      "EXE-DELEGATION-MATRIX",
      "EXE-CONFLICT-DISCLOSURE",
      "LEG-REGULATORY-IMPACT"
    ]
  },
  {
    "code": "LEG-04",
    "department": "LEGAL_CONTRACTS_INSURANCE",
    "titleAr": "النزاعات والتسويات",
    "templateCodes": [
      "LEG-DISPUTE-SETTLEMENT",
      "LEG-CLAIM-CLOSURE",
      "LEG-LEGAL-REPORT"
    ]
  },
  {
    "code": "LEG-05",
    "department": "LEGAL_CONTRACTS_INSURANCE",
    "titleAr": "التأمين والمطالبات التأمينية",
    "templateCodes": [
      "LEG-INSURANCE-CLAIM",
      "LEG-RENEWAL-REGISTER",
      "LEG-TERMINATION-HANDOFF",
      "LEG-CLAIM-CLOSURE"
    ]
  },
  {
    "code": "LEG-06",
    "department": "LEGAL_CONTRACTS_INSURANCE",
    "titleAr": "الخصوصية والملكية الفكرية",
    "templateCodes": [
      "RND-OUTPUT-IP-REGISTER",
      "MKT-CONTENT-RIGHTS",
      "RND-DATA-SOURCE-PERMISSIONS",
      "LEG-PRIVACY-IP-REQUEST"
    ]
  }
];

const ownership: Record<string,{ownerSectionCode:string;beneficiarySectionCodes:string[]}> = {
  "ADM-ARCHIVE-TRANSFER": {
    "ownerSectionCode": "ADM-02",
    "beneficiarySectionCodes": [
      "ADM-02"
    ]
  },
  "ADM-CORRESPONDENCE-REPORT": {
    "ownerSectionCode": "ADM-01",
    "beneficiarySectionCodes": [
      "ADM-01"
    ]
  },
  "ADM-DISPOSAL-REQUEST": {
    "ownerSectionCode": "ADM-02",
    "beneficiarySectionCodes": [
      "ADM-02"
    ]
  },
  "ADM-DOCUMENT-INDEX": {
    "ownerSectionCode": "ADM-02",
    "beneficiarySectionCodes": [
      "ADM-02",
      "ADM-03"
    ]
  },
  "ADM-INCOMING-CORRESPONDENCE": {
    "ownerSectionCode": "ADM-01",
    "beneficiarySectionCodes": [
      "ADM-01"
    ]
  },
  "ADM-MEETING-MINUTES": {
    "ownerSectionCode": "ADM-04",
    "beneficiarySectionCodes": [
      "ADM-04",
      "EXE-01"
    ]
  },
  "ADM-OUTGOING-CORRESPONDENCE": {
    "ownerSectionCode": "ADM-01",
    "beneficiarySectionCodes": [
      "ADM-01"
    ]
  },
  "ADM-REFERRAL-DELIVERY": {
    "ownerSectionCode": "ADM-01",
    "beneficiarySectionCodes": [
      "ADM-01",
      "ADM-04"
    ]
  },
  "ADM-RETENTION-ACCESS": {
    "ownerSectionCode": "ADM-02",
    "beneficiarySectionCodes": [
      "ADM-02"
    ]
  },
  "ADM-REVISION-REGISTER": {
    "ownerSectionCode": "ADM-02",
    "beneficiarySectionCodes": [
      "ADM-02",
      "ADM-03"
    ]
  },
  "CEX-CANCELLATION-REQUEST": {
    "ownerSectionCode": "CX-02",
    "beneficiarySectionCodes": [
      "CX-02"
    ]
  },
  "CEX-CASE-REPORT": {
    "ownerSectionCode": "CX-01",
    "beneficiarySectionCodes": [
      "CX-01",
      "CX-04"
    ]
  },
  "CEX-COMPLAINT": {
    "ownerSectionCode": "CX-03",
    "beneficiarySectionCodes": [
      "CX-03"
    ]
  },
  "CEX-CUSTOMER-NOTIFICATION": {
    "ownerSectionCode": "CX-01",
    "beneficiarySectionCodes": [
      "CX-01",
      "CX-02",
      "CX-05"
    ]
  },
  "CEX-REFERRAL-ESCALATION": {
    "ownerSectionCode": "CX-01",
    "beneficiarySectionCodes": [
      "CX-01",
      "CX-03",
      "MKT-04"
    ]
  },
  "CEX-REFUND-HANDOFF": {
    "ownerSectionCode": "CX-02",
    "beneficiarySectionCodes": [
      "FIN-02",
      "CX-02",
      "CX-03"
    ]
  },
  "CEX-RESOLUTION": {
    "ownerSectionCode": "CX-03",
    "beneficiarySectionCodes": [
      "CX-03",
      "CX-04"
    ]
  },
  "CEX-SATISFACTION-FOLLOWUP": {
    "ownerSectionCode": "CX-04",
    "beneficiarySectionCodes": [
      "CX-04"
    ]
  },
  "CEX-SERVICE-REQUEST": {
    "ownerSectionCode": "CX-02",
    "beneficiarySectionCodes": [
      "CX-01",
      "CX-02",
      "CX-05"
    ]
  },
  "EXE-BUDGET-HANDOFF": {
    "ownerSectionCode": "EXE-03",
    "beneficiarySectionCodes": [
      "FIN-05",
      "EXE-03"
    ]
  },
  "EXE-COMMITTEE-CHARTER": {
    "ownerSectionCode": "EXE-04",
    "beneficiarySectionCodes": [
      "EXE-04"
    ]
  },
  "EXE-COMMITTEE-MINUTES": {
    "ownerSectionCode": "EXE-01",
    "beneficiarySectionCodes": [
      "EXE-01",
      "EXE-04"
    ]
  },
  "EXE-CONFLICT-DISCLOSURE": {
    "ownerSectionCode": "EXE-04",
    "beneficiarySectionCodes": [
      "EXE-04",
      "LEG-03"
    ]
  },
  "EXE-DECISION": {
    "ownerSectionCode": "EXE-04",
    "beneficiarySectionCodes": [
      "EXE-04"
    ]
  },
  "EXE-DECISION-REPORT": {
    "ownerSectionCode": "EXE-01",
    "beneficiarySectionCodes": [
      "EXE-01",
      "EXE-02"
    ]
  },
  "EXE-DELEGATION-MATRIX": {
    "ownerSectionCode": "EXE-04",
    "beneficiarySectionCodes": [
      "EXE-04",
      "LEG-03"
    ]
  },
  "EXE-DEPARTMENT-CHARTER": {
    "ownerSectionCode": "EXE-04",
    "beneficiarySectionCodes": [
      "ADM-03",
      "EXE-04"
    ]
  },
  "EXE-FOLLOWUP": {
    "ownerSectionCode": "EXE-02",
    "beneficiarySectionCodes": [
      "ADM-04",
      "EXE-02",
      "EXE-05"
    ]
  },
  "EXE-PERFORMANCE-CLOSURE": {
    "ownerSectionCode": "EXE-01",
    "beneficiarySectionCodes": [
      "TECH-06",
      "EXE-01",
      "EXE-02",
      "EXE-03"
    ]
  },
  "EXE-STRATEGIC-PLAN": {
    "ownerSectionCode": "EXE-03",
    "beneficiarySectionCodes": [
      "EXE-03",
      "EXE-05"
    ]
  },
  "FAC-ASSET-CARD": {
    "ownerSectionCode": "FAC-03",
    "beneficiarySectionCodes": [
      "FAC-03"
    ]
  },
  "FAC-ASSET-HANDOVER": {
    "ownerSectionCode": "FAC-03",
    "beneficiarySectionCodes": [
      "FAC-03"
    ]
  },
  "FAC-ASSET-INSPECTION": {
    "ownerSectionCode": "FAC-03",
    "beneficiarySectionCodes": [
      "FAC-01",
      "FAC-03"
    ]
  },
  "FAC-ASSET-RETIREMENT": {
    "ownerSectionCode": "FAC-03",
    "beneficiarySectionCodes": [
      "FAC-03"
    ]
  },
  "FAC-MAINTENANCE-REPORT": {
    "ownerSectionCode": "FAC-02",
    "beneficiarySectionCodes": [
      "FAC-02"
    ]
  },
  "FAC-PREVENTIVE-PLAN": {
    "ownerSectionCode": "FAC-02",
    "beneficiarySectionCodes": [
      "FAC-02"
    ]
  },
  "FAC-SPARE-PARTS-ISSUE": {
    "ownerSectionCode": "FAC-02",
    "beneficiarySectionCodes": [
      "FAC-02"
    ]
  },
  "FAC-WARRANTY-CONTRACT-INDEX": {
    "ownerSectionCode": "FAC-02",
    "beneficiarySectionCodes": [
      "FAC-02",
      "FAC-05"
    ]
  },
  "FAC-WORK-ACCEPTANCE": {
    "ownerSectionCode": "FAC-02",
    "beneficiarySectionCodes": [
      "FAC-02",
      "FAC-04",
      "FAC-05"
    ]
  },
  "FAC-WORK-ORDER": {
    "ownerSectionCode": "FAC-02",
    "beneficiarySectionCodes": [
      "FAC-01",
      "FAC-02",
      "FAC-04"
    ]
  },
  "FIN-BANK-RECONCILIATION": {
    "ownerSectionCode": "FIN-01",
    "beneficiarySectionCodes": [
      "FIN-01",
      "FIN-03",
      "FIN-04"
    ]
  },
  "FIN-BUDGET-REVIEW": {
    "ownerSectionCode": "FIN-05",
    "beneficiarySectionCodes": [
      "INV-01",
      "FIN-05",
      "EXE-03"
    ]
  },
  "FIN-CLAIM-REVIEW": {
    "ownerSectionCode": "FIN-03",
    "beneficiarySectionCodes": [
      "FIN-03"
    ]
  },
  "FIN-INVOICE-MATCH": {
    "ownerSectionCode": "FIN-01",
    "beneficiarySectionCodes": [
      "INV-02",
      "FIN-01",
      "FIN-06"
    ]
  },
  "FIN-PAYMENT-VOUCHER": {
    "ownerSectionCode": "FIN-03",
    "beneficiarySectionCodes": [
      "FIN-03"
    ]
  },
  "FIN-PAYROLL-RECEIPT": {
    "ownerSectionCode": "FIN-03",
    "beneficiarySectionCodes": [
      "HR-03",
      "FIN-03"
    ]
  },
  "FIN-PERIOD-CLOSE": {
    "ownerSectionCode": "FIN-01",
    "beneficiarySectionCodes": [
      "FIN-01",
      "FIN-05",
      "FIN-06"
    ]
  },
  "FIN-PROVIDER-RECONCILIATION": {
    "ownerSectionCode": "FIN-02",
    "beneficiarySectionCodes": [
      "FIN-02",
      "FIN-04"
    ]
  },
  "FIN-RECEIPT-VOUCHER": {
    "ownerSectionCode": "FIN-02",
    "beneficiarySectionCodes": [
      "FIN-02"
    ]
  },
  "FIN-TRANSACTION-REPORT": {
    "ownerSectionCode": "FIN-01",
    "beneficiarySectionCodes": [
      "FIN-01"
    ]
  },
  "HR-ACCESS-REVOCATION": {
    "ownerSectionCode": "HR-02",
    "beneficiarySectionCodes": [
      "HR-02",
      "HR-08"
    ]
  },
  "HR-APPOINTMENT-RECORD": {
    "ownerSectionCode": "HR-01",
    "beneficiarySectionCodes": [
      "HR-01",
      "HR-02"
    ]
  },
  "HR-ASSET-CLEARANCE": {
    "ownerSectionCode": "HR-02",
    "beneficiarySectionCodes": [
      "HR-02",
      "HR-08"
    ]
  },
  "HR-ATTENDANCE-SUMMARY": {
    "ownerSectionCode": "HR-03",
    "beneficiarySectionCodes": [
      "HR-03",
      "HR-05"
    ]
  },
  "HR-COMMENCEMENT": {
    "ownerSectionCode": "HR-02",
    "beneficiarySectionCodes": [
      "HR-02",
      "HR-08"
    ]
  },
  "HR-COMPENSATION-MEMO": {
    "ownerSectionCode": "HR-03",
    "beneficiarySectionCodes": [
      "HR-03"
    ]
  },
  "HR-CONTRACT-AMENDMENT-REQUEST": {
    "ownerSectionCode": "HR-02",
    "beneficiarySectionCodes": [
      "HR-02"
    ]
  },
  "HR-DISCIPLINARY-REFERRAL": {
    "ownerSectionCode": "HR-07",
    "beneficiarySectionCodes": [
      "HR-07"
    ]
  },
  "HR-EMPLOYEE-FILE-INDEX": {
    "ownerSectionCode": "HR-02",
    "beneficiarySectionCodes": [
      "HR-02",
      "HR-06"
    ]
  },
  "HR-EMPLOYEE-REPORT": {
    "ownerSectionCode": "HR-02",
    "beneficiarySectionCodes": [
      "HR-02"
    ]
  },
  "HR-FILE-CLOSURE": {
    "ownerSectionCode": "HR-02",
    "beneficiarySectionCodes": [
      "HR-02"
    ]
  },
  "HR-FINAL-SETTLEMENT": {
    "ownerSectionCode": "HR-02",
    "beneficiarySectionCodes": [
      "HR-02"
    ]
  },
  "HR-GRIEVANCE-RECORD": {
    "ownerSectionCode": "HR-07",
    "beneficiarySectionCodes": [
      "HR-07"
    ]
  },
  "HR-INVESTIGATION-RECORD": {
    "ownerSectionCode": "HR-07",
    "beneficiarySectionCodes": [
      "HR-07"
    ]
  },
  "HR-JOB-DESCRIPTION": {
    "ownerSectionCode": "HR-01",
    "beneficiarySectionCodes": [
      "HR-01",
      "HR-04"
    ]
  },
  "HR-LEAVE-REQUEST": {
    "ownerSectionCode": "HR-05",
    "beneficiarySectionCodes": [
      "HR-05"
    ]
  },
  "HR-LEAVE-RETURN": {
    "ownerSectionCode": "HR-05",
    "beneficiarySectionCodes": [
      "HR-05"
    ]
  },
  "HR-OFFBOARDING-NOTICE": {
    "ownerSectionCode": "HR-02",
    "beneficiarySectionCodes": [
      "HR-02",
      "HR-07"
    ]
  },
  "HR-PAYROLL-HANDOFF": {
    "ownerSectionCode": "HR-03",
    "beneficiarySectionCodes": [
      "HR-03",
      "HR-05"
    ]
  },
  "HR-PERFORMANCE-REVIEW": {
    "ownerSectionCode": "HR-04",
    "beneficiarySectionCodes": [
      "HR-04"
    ]
  },
  "HR-STAFFING-NEED": {
    "ownerSectionCode": "HR-01",
    "beneficiarySectionCodes": [
      "HR-01"
    ]
  },
  "INV-CUSTODY-RECORD": {
    "ownerSectionCode": "INV-06",
    "beneficiarySectionCodes": [
      "MAR-05",
      "INV-06",
      "FAC-03"
    ]
  },
  "INV-DAMAGE-DISPOSITION": {
    "ownerSectionCode": "INV-04",
    "beneficiarySectionCodes": [
      "INV-04",
      "INV-06"
    ]
  },
  "INV-ISSUE-RECORD": {
    "ownerSectionCode": "INV-03",
    "beneficiarySectionCodes": [
      "INV-03",
      "INV-05"
    ]
  },
  "INV-PURCHASE-REQUEST": {
    "ownerSectionCode": "INV-01",
    "beneficiarySectionCodes": [
      "INV-01"
    ]
  },
  "INV-RECEIPT-INSPECTION": {
    "ownerSectionCode": "INV-02",
    "beneficiarySectionCodes": [
      "INV-02",
      "INV-03",
      "FAC-05"
    ]
  },
  "INV-RENTAL-HANDOVER": {
    "ownerSectionCode": "INV-06",
    "beneficiarySectionCodes": [
      "INV-06"
    ]
  },
  "INV-RENTAL-RETURN": {
    "ownerSectionCode": "INV-06",
    "beneficiarySectionCodes": [
      "INV-06"
    ]
  },
  "INV-RETURN-RECORD": {
    "ownerSectionCode": "INV-03",
    "beneficiarySectionCodes": [
      "INV-03",
      "INV-05"
    ]
  },
  "INV-STOCK-REPORT": {
    "ownerSectionCode": "INV-04",
    "beneficiarySectionCodes": [
      "INV-04"
    ]
  },
  "INV-STOCKTAKE": {
    "ownerSectionCode": "INV-04",
    "beneficiarySectionCodes": [
      "INV-04"
    ]
  },
  "INV-TRANSFER": {
    "ownerSectionCode": "INV-05",
    "beneficiarySectionCodes": [
      "INV-03",
      "INV-04",
      "INV-05"
    ]
  },
  "LEG-CLAIM-CLOSURE": {
    "ownerSectionCode": "LEG-04",
    "beneficiarySectionCodes": [
      "CX-03",
      "LEG-04",
      "LEG-05"
    ]
  },
  "LEG-CONTRACT-REQUEST": {
    "ownerSectionCode": "LEG-02",
    "beneficiarySectionCodes": [
      "HR-02",
      "MKT-06",
      "LEG-02"
    ]
  },
  "LEG-CONTRACT-REVIEW": {
    "ownerSectionCode": "LEG-02",
    "beneficiarySectionCodes": [
      "MKT-06",
      "LEG-02"
    ]
  },
  "LEG-DISPUTE-SETTLEMENT": {
    "ownerSectionCode": "LEG-04",
    "beneficiarySectionCodes": [
      "LEG-04"
    ]
  },
  "LEG-INSURANCE-CLAIM": {
    "ownerSectionCode": "LEG-05",
    "beneficiarySectionCodes": [
      "SAF-04",
      "LEG-05"
    ]
  },
  "LEG-LEGAL-REPORT": {
    "ownerSectionCode": "LEG-01",
    "beneficiarySectionCodes": [
      "LEG-01",
      "LEG-04"
    ]
  },
  "LEG-PARTY-CAPACITY": {
    "ownerSectionCode": "LEG-02",
    "beneficiarySectionCodes": [
      "LEG-02"
    ]
  },
  "LEG-RENEWAL-REGISTER": {
    "ownerSectionCode": "LEG-02",
    "beneficiarySectionCodes": [
      "LEG-02",
      "LEG-05"
    ]
  },
  "LEG-REVIEW-CHANGE-LOG": {
    "ownerSectionCode": "LEG-01",
    "beneficiarySectionCodes": [
      "LEG-01",
      "LEG-02",
      "LEG-03"
    ]
  },
  "LEG-SIGNED-VERSION-INDEX": {
    "ownerSectionCode": "LEG-02",
    "beneficiarySectionCodes": [
      "HR-02",
      "LEG-02"
    ]
  },
  "LEG-TERMINATION-HANDOFF": {
    "ownerSectionCode": "LEG-02",
    "beneficiarySectionCodes": [
      "LEG-02",
      "LEG-05"
    ]
  },
  "MAR-CREW-MANIFEST": {
    "ownerSectionCode": "MAR-01",
    "beneficiarySectionCodes": [
      "MAR-01",
      "MAR-03"
    ]
  },
  "MAR-DIVE-LOG": {
    "ownerSectionCode": "MAR-02",
    "beneficiarySectionCodes": [
      "MAR-02"
    ]
  },
  "MAR-OPERATING-ORDER": {
    "ownerSectionCode": "MAR-01",
    "beneficiarySectionCodes": [
      "MAR-01",
      "MAR-03",
      "MAR-04"
    ]
  },
  "MAR-PARTICIPANT-MANIFEST": {
    "ownerSectionCode": "MAR-01",
    "beneficiarySectionCodes": [
      "MAR-01",
      "MAR-03",
      "MAR-07"
    ]
  },
  "MAR-PARTICIPANT-READINESS": {
    "ownerSectionCode": "MAR-02",
    "beneficiarySectionCodes": [
      "MAR-02",
      "MAR-06",
      "TRN-05"
    ]
  },
  "MAR-PERMIT-INDEX": {
    "ownerSectionCode": "MAR-04",
    "beneficiarySectionCodes": [
      "MAR-04",
      "MAR-06"
    ]
  },
  "MAR-RETURN-CLOSURE": {
    "ownerSectionCode": "MAR-07",
    "beneficiarySectionCodes": [
      "MAR-07"
    ]
  },
  "MAR-SAFETY-BRIEFING": {
    "ownerSectionCode": "MAR-02",
    "beneficiarySectionCodes": [
      "MAR-02",
      "MAR-06",
      "TRN-05"
    ]
  },
  "MAR-SETTLEMENT-HANDOFF": {
    "ownerSectionCode": "MAR-07",
    "beneficiarySectionCodes": [
      "MAR-07",
      "FIN-04"
    ]
  },
  "MAR-TRIP-CHECKLIST": {
    "ownerSectionCode": "MAR-02",
    "beneficiarySectionCodes": [
      "MAR-02",
      "MAR-05",
      "SAF-03"
    ]
  },
  "MAR-TRIP-REPORT": {
    "ownerSectionCode": "MAR-07",
    "beneficiarySectionCodes": [
      "MAR-07"
    ]
  },
  "MKT-BRAND-IDENTITY-REGISTER": {
    "ownerSectionCode": "MKT-01",
    "beneficiarySectionCodes": [
      "MKT-01",
      "MKT-03"
    ]
  },
  "MKT-CAMPAIGN-BRIEF": {
    "ownerSectionCode": "MKT-05",
    "beneficiarySectionCodes": [
      "MKT-01",
      "MKT-05"
    ]
  },
  "MKT-CAMPAIGN-REPORT": {
    "ownerSectionCode": "MKT-07",
    "beneficiarySectionCodes": [
      "MKT-05",
      "MKT-07"
    ]
  },
  "MKT-CONTENT-APPROVAL": {
    "ownerSectionCode": "MKT-02",
    "beneficiarySectionCodes": [
      "MKT-02",
      "MKT-03"
    ]
  },
  "MKT-CONTENT-CALENDAR": {
    "ownerSectionCode": "MKT-02",
    "beneficiarySectionCodes": [
      "MKT-02",
      "MKT-04"
    ]
  },
  "MKT-CONTENT-RIGHTS": {
    "ownerSectionCode": "MKT-02",
    "beneficiarySectionCodes": [
      "MKT-02",
      "MKT-03",
      "LEG-06"
    ]
  },
  "MKT-MARKETING-PLAN": {
    "ownerSectionCode": "MKT-01",
    "beneficiarySectionCodes": [
      "MKT-01",
      "MKT-05",
      "MKT-06"
    ]
  },
  "MKT-PUBLICATION-EVIDENCE": {
    "ownerSectionCode": "MKT-04",
    "beneficiarySectionCodes": [
      "MKT-04"
    ]
  },
  "MKT-PUBLISH-ORDER": {
    "ownerSectionCode": "MKT-04",
    "beneficiarySectionCodes": [
      "MKT-04"
    ]
  },
  "MKT-SPEND-RECONCILIATION": {
    "ownerSectionCode": "MKT-05",
    "beneficiarySectionCodes": [
      "MKT-05",
      "MKT-07"
    ]
  },
  "RND-ADOPTION-HANDOFF": {
    "ownerSectionCode": "RND-02",
    "beneficiarySectionCodes": [
      "TRN-01",
      "EXE-05",
      "RND-02",
      "RND-04"
    ]
  },
  "RND-DATA-SOURCE-PERMISSIONS": {
    "ownerSectionCode": "RND-01",
    "beneficiarySectionCodes": [
      "RND-01",
      "RND-03",
      "LEG-06"
    ]
  },
  "RND-EXPERIMENT-PLAN": {
    "ownerSectionCode": "RND-02",
    "beneficiarySectionCodes": [
      "MKT-07",
      "RND-02",
      "RND-04"
    ]
  },
  "RND-EXPERIMENT-RESULTS": {
    "ownerSectionCode": "RND-04",
    "beneficiarySectionCodes": [
      "MKT-07",
      "RND-04"
    ]
  },
  "RND-FEASIBILITY": {
    "ownerSectionCode": "RND-03",
    "beneficiarySectionCodes": [
      "RND-03"
    ]
  },
  "RND-OUTPUT-IP-REGISTER": {
    "ownerSectionCode": "RND-02",
    "beneficiarySectionCodes": [
      "RND-02",
      "LEG-06"
    ]
  },
  "RND-RESEARCH-BRIEF": {
    "ownerSectionCode": "RND-01",
    "beneficiarySectionCodes": [
      "RND-01"
    ]
  },
  "RND-RESEARCH-PROPOSAL": {
    "ownerSectionCode": "RND-01",
    "beneficiarySectionCodes": [
      "RND-01",
      "RND-02"
    ]
  },
  "RND-SCOPE-REVIEW": {
    "ownerSectionCode": "RND-02",
    "beneficiarySectionCodes": [
      "RND-02",
      "RND-03",
      "RND-04"
    ]
  },
  "RND-STUDY-REPORT": {
    "ownerSectionCode": "RND-01",
    "beneficiarySectionCodes": [
      "RND-01",
      "RND-03"
    ]
  },
  "SAF-CAPA": {
    "ownerSectionCode": "SAF-06",
    "beneficiarySectionCodes": [
      "SAF-01",
      "SAF-06",
      "CX-04"
    ]
  },
  "SAF-COMPLIANCE-REGISTER": {
    "ownerSectionCode": "SAF-02",
    "beneficiarySectionCodes": [
      "SAF-02",
      "SAF-05"
    ]
  },
  "SAF-EFFECTIVENESS-CLOSE": {
    "ownerSectionCode": "SAF-03",
    "beneficiarySectionCodes": [
      "SAF-03",
      "SAF-06"
    ]
  },
  "SAF-EMERGENCY-PLAN": {
    "ownerSectionCode": "SAF-04",
    "beneficiarySectionCodes": [
      "SAF-04"
    ]
  },
  "SAF-INCIDENT": {
    "ownerSectionCode": "SAF-04",
    "beneficiarySectionCodes": [
      "SAF-04"
    ]
  },
  "SAF-INCIDENT-REPORT": {
    "ownerSectionCode": "SAF-04",
    "beneficiarySectionCodes": [
      "SAF-04"
    ]
  },
  "SAF-INSPECTION-AUDIT": {
    "ownerSectionCode": "SAF-02",
    "beneficiarySectionCodes": [
      "MAR-05",
      "SAF-02",
      "SAF-03",
      "SAF-05",
      "SAF-06",
      "FAC-01"
    ]
  },
  "SAF-PLAN-BRIEFING": {
    "ownerSectionCode": "SAF-04",
    "beneficiarySectionCodes": [
      "SAF-04"
    ]
  },
  "SAF-RISK-ASSESSMENT": {
    "ownerSectionCode": "SAF-01",
    "beneficiarySectionCodes": [
      "SAF-01",
      "SAF-02",
      "SAF-03"
    ]
  },
  "TEC-ACCESS-MATRIX": {
    "ownerSectionCode": "TECH-05",
    "beneficiarySectionCodes": [
      "TECH-05"
    ]
  },
  "TEC-ACCESS-REQUEST": {
    "ownerSectionCode": "TECH-05",
    "beneficiarySectionCodes": [
      "TECH-05"
    ]
  },
  "TEC-ACCESS-REVOCATION": {
    "ownerSectionCode": "TECH-05",
    "beneficiarySectionCodes": [
      "TECH-05"
    ]
  },
  "TEC-BACKUP-LOG": {
    "ownerSectionCode": "TECH-04",
    "beneficiarySectionCodes": [
      "TECH-04"
    ]
  },
  "TEC-CHANGE-REQUEST": {
    "ownerSectionCode": "TECH-01",
    "beneficiarySectionCodes": [
      "TECH-01",
      "TECH-02",
      "TECH-07"
    ]
  },
  "TEC-INCIDENT-RESOLUTION": {
    "ownerSectionCode": "TECH-02",
    "beneficiarySectionCodes": [
      "TECH-02",
      "TECH-03",
      "TECH-05",
      "TECH-07"
    ]
  },
  "TEC-RELEASE-RECORD": {
    "ownerSectionCode": "TECH-02",
    "beneficiarySectionCodes": [
      "TECH-02",
      "TECH-03",
      "TECH-04",
      "TECH-07"
    ]
  },
  "TEC-RESTORE-TEST": {
    "ownerSectionCode": "TECH-03",
    "beneficiarySectionCodes": [
      "TECH-03",
      "TECH-04"
    ]
  },
  "TEC-SECURITY-INCIDENT": {
    "ownerSectionCode": "TECH-05",
    "beneficiarySectionCodes": [
      "TECH-05"
    ]
  },
  "TEC-SECURITY-REPORT": {
    "ownerSectionCode": "TECH-05",
    "beneficiarySectionCodes": [
      "TECH-05"
    ]
  },
  "TEC-SYSTEM-ASSET-REGISTER": {
    "ownerSectionCode": "TECH-01",
    "beneficiarySectionCodes": [
      "TECH-01",
      "TECH-04",
      "TECH-06"
    ]
  },
  "TRN-ASSESSMENT": {
    "ownerSectionCode": "TRN-06",
    "beneficiarySectionCodes": [
      "HR-04",
      "TRN-04",
      "TRN-06"
    ]
  },
  "TRN-ASSESSMENT-APPEAL": {
    "ownerSectionCode": "TRN-06",
    "beneficiarySectionCodes": [
      "TRN-06"
    ]
  },
  "TRN-ATTENDANCE-RECORD": {
    "ownerSectionCode": "TRN-04",
    "beneficiarySectionCodes": [
      "HR-04",
      "TRN-04",
      "TRN-05",
      "TRN-07"
    ]
  },
  "TRN-CERTIFICATE-HANDOFF": {
    "ownerSectionCode": "TRN-07",
    "beneficiarySectionCodes": [
      "TRN-07"
    ]
  },
  "TRN-COURSE-REPORT": {
    "ownerSectionCode": "TRN-06",
    "beneficiarySectionCodes": [
      "TRN-06"
    ]
  },
  "TRN-ENROLLMENT": {
    "ownerSectionCode": "TRN-02",
    "beneficiarySectionCodes": [
      "TRN-02"
    ]
  },
  "TRN-INSTRUCTOR-ELIGIBILITY": {
    "ownerSectionCode": "TRN-03",
    "beneficiarySectionCodes": [
      "HR-06",
      "TRN-03"
    ]
  },
  "TRN-PROGRAM-REVIEW": {
    "ownerSectionCode": "TRN-01",
    "beneficiarySectionCodes": [
      "TRN-01",
      "TRN-06"
    ]
  },
  "TRN-RESULT-REVIEW": {
    "ownerSectionCode": "TRN-06",
    "beneficiarySectionCodes": [
      "TRN-06",
      "TRN-07"
    ]
  },
  "TRN-SKILLS-RECORD": {
    "ownerSectionCode": "TRN-05",
    "beneficiarySectionCodes": [
      "TRN-05",
      "TRN-07"
    ]
  },
  "TRN-TRAINEE-ACKNOWLEDGEMENT": {
    "ownerSectionCode": "TRN-02",
    "beneficiarySectionCodes": [
      "TRN-02",
      "TRN-06"
    ]
  },
  "TRN-TRAINEE-PREREQUISITES": {
    "ownerSectionCode": "TRN-02",
    "beneficiarySectionCodes": [
      "TRN-02"
    ]
  },
  "TRN-TRAINING-PLAN": {
    "ownerSectionCode": "TRN-01",
    "beneficiarySectionCodes": [
      "TRN-01",
      "TRN-03",
      "TRN-04"
    ]
  },
  "HR-RECRUITMENT-REVIEW": {
    "ownerSectionCode": "HR-01",
    "beneficiarySectionCodes": [
      "HR-01"
    ]
  },
  "HR-DEVELOPMENT-PLAN": {
    "ownerSectionCode": "HR-04",
    "beneficiarySectionCodes": [
      "HR-04"
    ]
  },
  "HR-CREDENTIAL-REGISTER": {
    "ownerSectionCode": "HR-06",
    "beneficiarySectionCodes": [
      "HR-06"
    ]
  },
  "HR-TRANSFER-ASSIGNMENT": {
    "ownerSectionCode": "HR-08",
    "beneficiarySectionCodes": [
      "HR-02",
      "HR-08"
    ]
  },
  "MAR-RESOURCE-SCHEDULE": {
    "ownerSectionCode": "MAR-01",
    "beneficiarySectionCodes": [
      "MAR-01",
      "MAR-03"
    ]
  },
  "MAR-SITE-BERTH-READINESS": {
    "ownerSectionCode": "MAR-04",
    "beneficiarySectionCodes": [
      "MAR-04"
    ]
  },
  "MAR-VESSEL-MAINTENANCE": {
    "ownerSectionCode": "MAR-05",
    "beneficiarySectionCodes": [
      "MAR-05"
    ]
  },
  "MAR-WEATHER-DECISION": {
    "ownerSectionCode": "MAR-07",
    "beneficiarySectionCodes": [
      "MAR-07"
    ]
  },
  "TRN-CENTER-ELIGIBILITY": {
    "ownerSectionCode": "TRN-03",
    "beneficiarySectionCodes": [
      "TRN-03"
    ]
  },
  "TRN-ELEARNING-PROGRESS": {
    "ownerSectionCode": "TRN-04",
    "beneficiarySectionCodes": [
      "TRN-04"
    ]
  },
  "TRN-PRACTICAL-SESSION": {
    "ownerSectionCode": "TRN-05",
    "beneficiarySectionCodes": [
      "TRN-05"
    ]
  },
  "INV-SUPPLIER-QUALIFICATION": {
    "ownerSectionCode": "INV-02",
    "beneficiarySectionCodes": [
      "INV-02",
      "FAC-05"
    ]
  },
  "INV-QUOTE-COMPARISON": {
    "ownerSectionCode": "INV-01",
    "beneficiarySectionCodes": [
      "INV-01",
      "INV-02"
    ]
  },
  "INV-PURCHASE-ORDER": {
    "ownerSectionCode": "INV-01",
    "beneficiarySectionCodes": [
      "INV-01",
      "INV-02"
    ]
  },
  "INV-FULFILLMENT-DELIVERY": {
    "ownerSectionCode": "INV-05",
    "beneficiarySectionCodes": [
      "INV-05"
    ]
  },
  "FIN-RECEIVABLES-AGING": {
    "ownerSectionCode": "FIN-02",
    "beneficiarySectionCodes": [
      "FIN-02"
    ]
  },
  "FIN-PROVIDER-SETTLEMENT": {
    "ownerSectionCode": "FIN-04",
    "beneficiarySectionCodes": [
      "FIN-04"
    ]
  },
  "FIN-OBLIGATION-RETURN-REGISTER": {
    "ownerSectionCode": "FIN-06",
    "beneficiarySectionCodes": [
      "FIN-06"
    ]
  },
  "FIN-CASH-COMMITMENT-SCHEDULE": {
    "ownerSectionCode": "FIN-03",
    "beneficiarySectionCodes": [
      "FIN-03"
    ]
  },
  "SAF-RISK-REGISTER": {
    "ownerSectionCode": "SAF-01",
    "beneficiarySectionCodes": [
      "SAF-01"
    ]
  },
  "SAF-OPERATING-CONTROL-MATRIX": {
    "ownerSectionCode": "SAF-02",
    "beneficiarySectionCodes": [
      "SAF-02"
    ]
  },
  "SAF-EMERGENCY-DRILL": {
    "ownerSectionCode": "SAF-04",
    "beneficiarySectionCodes": [
      "SAF-04"
    ]
  },
  "SAF-ENVIRONMENTAL-RECORD": {
    "ownerSectionCode": "SAF-05",
    "beneficiarySectionCodes": [
      "SAF-05"
    ]
  },
  "CEX-MEMBERSHIP-COMMUNITY": {
    "ownerSectionCode": "CX-05",
    "beneficiarySectionCodes": [
      "CX-05"
    ]
  },
  "MKT-CREATIVE-PRODUCTION": {
    "ownerSectionCode": "MKT-03",
    "beneficiarySectionCodes": [
      "MKT-03"
    ]
  },
  "MKT-SALES-PARTNERSHIP": {
    "ownerSectionCode": "MKT-06",
    "beneficiarySectionCodes": [
      "MKT-06"
    ]
  },
  "TEC-REQUIREMENT-ACCEPTANCE": {
    "ownerSectionCode": "TECH-01",
    "beneficiarySectionCodes": [
      "TECH-01",
      "TECH-02"
    ]
  },
  "TEC-TEST-DEFECT-REGISTER": {
    "ownerSectionCode": "TECH-03",
    "beneficiarySectionCodes": [
      "TECH-03"
    ]
  },
  "TEC-DATA-QUALITY-DICTIONARY": {
    "ownerSectionCode": "TECH-06",
    "beneficiarySectionCodes": [
      "TECH-06"
    ]
  },
  "TEC-AGENT-GOVERNANCE": {
    "ownerSectionCode": "TECH-07",
    "beneficiarySectionCodes": [
      "TECH-07"
    ]
  },
  "FAC-DAILY-READINESS": {
    "ownerSectionCode": "FAC-01",
    "beneficiarySectionCodes": [
      "FAC-01",
      "FAC-04"
    ]
  },
  "ADM-PROCEDURE-CARD": {
    "ownerSectionCode": "ADM-03",
    "beneficiarySectionCodes": [
      "ADM-03"
    ]
  },
  "EXE-INITIATIVE-CHANGE": {
    "ownerSectionCode": "EXE-05",
    "beneficiarySectionCodes": [
      "EXE-05"
    ]
  },
  "LEG-REGULATORY-IMPACT": {
    "ownerSectionCode": "LEG-03",
    "beneficiarySectionCodes": [
      "LEG-01",
      "LEG-03"
    ]
  },
  "LEG-PRIVACY-IP-REQUEST": {
    "ownerSectionCode": "LEG-06",
    "beneficiarySectionCodes": [
      "LEG-06"
    ]
  }
};

export function completeSectionDutyTemplates(organizationId:string, baseline:DocumentTemplate[]):DocumentTemplate[] {
  const existing=baseline.map(t=>{
    const extra=SECTION_FORM_EXTENSIONS[t.code];
    if(!extra)return t;
    if(extra.some(f=>t.fields.some(old=>old.key===f.key)))throw new Error('Duplicate section field key: '+t.code);
    const control=t.fields.findIndex(f=>f.key==='recordDetails'||f.key==='recordDate');
    const at=control<0?t.fields.length:control;
    return {...t,fields:[...t.fields.slice(0,at),...extra.map(f=>({...f,...(f.options?{options:[...f.options]}:{})})),...t.fields.slice(at)]};
  });
  const created=additions.map(t=>({id:`section-duty-${t.code.toLowerCase()}`,organizationId,code:t.code,
    department:t.department,titleAr:t.titleAr,titleEn:t.titleEn,version:1,active:true,printable:true,
    fields:[...t.fields,...commonFields].map(f=>({...f,...(f.options?{options:[...f.options]}:{})}))}));
  const all=[...existing,...created].sort((a,b)=>a.code.localeCompare(b.code));
  if(new Set(all.map(t=>t.code)).size!==all.length)throw new Error('Duplicate section template code.');
  return all;
}

export function sectionFormGuidance(code:string){
  const owner=ownership[code];if(!owner)return null;
  const section=SECTION_FORM_COVERAGE.find(s=>s.code===owner.ownerSectionCode)!;
  return {department:section.department,sectionDutySource:SECTION_DUTY_SOURCE,visualIdentity:SECTION_FORM_IDENTITY,
    ownerSectionCode:owner.ownerSectionCode,ownerSectionTitleAr:section.titleAr,
    beneficiarySectionCodes:[...owner.beneficiarySectionCodes],
    preparationAr:'أدخل البيانات من سجلاتها الأصلية. توثق الجداول البنود والأدلة؛ لا تُنشأ بها موافقة أو صلاحية أو دفعة أو تصريح تشغيل.'};
}
