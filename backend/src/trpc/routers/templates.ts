import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { documentTemplates, generatedDocuments, caseDocuments, cases } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createNotification } from './notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard dynamic template seeder helper
export const ensureDefaultTemplates = async () => {
  const templates = await db.select().from(documentTemplates);
  if (templates.length === 0) {
    const defaultList = [
      {
        title: 'Right to Information (RTI) Application',
        description: 'Standard application under Section 6(1) of the RTI Act to request public government information.',
        category: 'rti',
        contentTemplate: `To,
The Public Information Officer,
{{authorityName}}
{{authorityAddress}}

Subject: Request for Information under Section 6(1) of the RTI Act, 2005.

1. Full Name of the Applicant: {{applicantName}}
2. Address: {{applicantAddress}}
3. Particulars of Information required:
   {{infoRequested}}
4. Period for which information is asked: {{infoPeriod}}
5. I state that the information sought does not fall within the restrictions contained in Section 8 and 9 of the Act and to the best of my knowledge it pertains to your office.
6. A fee of Rs. 10/- has been paid through {{paymentMethod}} bearing Receipt/Transaction ID: {{paymentTxId}}.

Place: {{place}}
Date: {{date}}

Signature of Applicant:
________________________
({{applicantName}})`,
        fieldsSchema: [
          { name: 'authorityName', label: 'Public Authority Name', type: 'text', placeholder: 'e.g. Municipal Corporation Office' },
          { name: 'authorityAddress', label: 'Authority Address', type: 'text', placeholder: 'e.g. 12/A, Civil Lines Road' },
          { name: 'applicantName', label: 'Applicant Name', type: 'text', placeholder: 'Your full legal name' },
          { name: 'applicantAddress', label: 'Applicant Address', type: 'text', placeholder: 'Your complete residential address' },
          { name: 'infoRequested', label: 'Information Required', type: 'textarea', placeholder: 'Describe the specific records or information needed clearly.' },
          { name: 'infoPeriod', label: 'Time Period', type: 'text', placeholder: 'e.g. April 2025 to March 2026' },
          { name: 'paymentMethod', label: 'Payment Method', type: 'select', options: ['IPO / Postal Order', 'Demand Draft', 'Cash Receipt', 'Online Payment'] },
          { name: 'paymentTxId', label: 'Payment Receipt / Transaction ID', type: 'text', placeholder: 'Receipt or Tx ID' },
          { name: 'place', label: 'Place', type: 'text', placeholder: 'Your current location' },
          { name: 'date', label: 'Date', type: 'text', placeholder: 'YYYY-MM-DD' }
        ]
      },
      {
        title: 'Consumer Dispute Complaint',
        description: 'Standard format to initiate a legal complaint before the District Consumer Disputes Redressal Commission.',
        category: 'consumer',
        contentTemplate: `BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION, AT {{district}}

IN THE MATTER OF:
{{complainantName}}
Resident of: {{complainantAddress}}
... COMPLAINANT

VERSUS

{{oppositePartyName}}
Located at: {{oppositePartyAddress}}
... OPPOSITE PARTY

COMPLAINT UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019.

MOST RESPECTFULLY SHOWETH:
1. That the Complainant purchased {{productName}} from the Opposite Party on {{purchaseDate}} for a consideration of {{amountPaid}}/-.
2. That the product/service was defective/deficient in the following manner:
   {{disputeDescription}}
3. That the Complainant sent a legal notice to the Opposite Party on {{noticeDate}} but received no satisfactory resolution.

PRAYER:
It is therefore respectfully prayed that this Commission may be pleased to direct the Opposite Party to:
a) Refund the purchase amount of {{amountPaid}}/- with interest.
b) Pay compensation of {{compensationAmount}}/- for mental harassment and agony.
c) Pass any other order this Commission deems fit.

Complainant:
________________________
({{complainantName}})`,
        fieldsSchema: [
          { name: 'district', label: 'District Commission Location', type: 'text', placeholder: 'e.g. New Delhi' },
          { name: 'complainantName', label: 'Complainant Full Name', type: 'text', placeholder: 'Your Name' },
          { name: 'complainantAddress', label: 'Complainant Address', type: 'text', placeholder: 'Your Address' },
          { name: 'oppositePartyName', label: 'Opposite Party (Company/Vendor)', type: 'text', placeholder: 'e.g. ABC Electronics Pvt Ltd' },
          { name: 'oppositePartyAddress', label: 'Opposite Party Address', type: 'text', placeholder: 'Opposite Party Address' },
          { name: 'productName', label: 'Product / Service Description', type: 'text', placeholder: 'e.g. Smart TV Model X-1' },
          { name: 'purchaseDate', label: 'Purchase Date', type: 'text', placeholder: 'YYYY-MM-DD' },
          { name: 'amountPaid', label: 'Amount Paid (in Rs.)', type: 'text', placeholder: 'e.g. 45000' },
          { name: 'disputeDescription', label: 'Details of Defect / Issue', type: 'textarea', placeholder: 'Detail what went wrong with the product or service.' },
          { name: 'noticeDate', label: 'Legal Notice Send Date', type: 'text', placeholder: 'YYYY-MM-DD' },
          { name: 'compensationAmount', label: 'Compensation Requested (in Rs.)', type: 'text', placeholder: 'e.g. 10000' }
        ]
      },
      {
        title: 'Tenant Eviction & Termination Notice',
        description: 'Statutory notice under Section 106 of the Transfer of Property Act to terminate lease and demand vacant possession.',
        category: 'agreement',
        contentTemplate: `LEGAL NOTICE OF LEASE TERMINATION & VACATION OF PREMISES
(UNDER SECTION 106 OF THE TRANSFER OF PROPERTY ACT, 1882)

To,
{{tenantName}}
Resident of: {{premisesAddress}}

Subject: Notice to quit and vacate the scheduled premises within {{noticeDays}} days.

Sir/Madam,
Under instructions from and on behalf of my client/landlord {{landlordName}}, residing at {{landlordAddress}}, I hereby serve you with this formal legal notice:

1. That you entered into a tenancy/lease arrangement with my client on {{leaseStartDate}} in respect of residential/commercial premises located at: {{premisesAddress}}.
2. That the agreed monthly rental consideration was fixed at Rs. {{monthlyRent}}/- payable on or before the 5th day of every calendar month.
3. Grounds for Termination:
   {{evictionGrounds}}
4. That you are in default/unauthorized occupation, and your tenancy stands formally terminated upon the expiry of {{noticeDays}} days from receipt of this notice.
5. You are hereby called upon to peacefully handover vacant possession of the premises to my client on or before {{vacateDeadlineDate}}, failing which my client shall initiate formal eviction proceedings in the competent civil court at your sole risk and costs.

Issued by:
________________________
{{landlordName}} / Counsel
Dated: {{noticeDate}}
Place: {{place}}`,
        fieldsSchema: [
          { name: 'tenantName', label: 'Tenant Full Name', type: 'text', placeholder: 'Full Name of the Tenant' },
          { name: 'premisesAddress', label: 'Rented Premises Address', type: 'text', placeholder: 'Complete address of the rented property' },
          { name: 'landlordName', label: 'Landlord Full Name', type: 'text', placeholder: 'Landlord Legal Name' },
          { name: 'landlordAddress', label: 'Landlord Residential Address', type: 'text', placeholder: 'Landlord Contact Address' },
          { name: 'leaseStartDate', label: 'Lease Commencement Date', type: 'text', placeholder: 'YYYY-MM-DD' },
          { name: 'monthlyRent', label: 'Monthly Rent (in Rs.)', type: 'text', placeholder: 'e.g. 18000' },
          { name: 'evictionGrounds', label: 'Grounds for Eviction / Lease Violation', type: 'textarea', placeholder: 'e.g. Non-payment of rent for 3 consecutive months and breach of residential clause.' },
          { name: 'noticeDays', label: 'Notice Period (Days)', type: 'text', placeholder: 'e.g. 15 or 30' },
          { name: 'vacateDeadlineDate', label: 'Deadline Date to Vacate', type: 'text', placeholder: 'YYYY-MM-DD' },
          { name: 'noticeDate', label: 'Date of Notice', type: 'text', placeholder: 'YYYY-MM-DD' },
          { name: 'place', label: 'Place', type: 'text', placeholder: 'City / Location' }
        ]
      },
      {
        title: 'Sworn Court Affidavit & Verification',
        description: 'Standard sworn affidavit for submission before judicial magistrates, civil courts, or public authorities.',
        category: 'affidavit',
        contentTemplate: `BEFORE THE HON'BLE COURT / AUTHORITY AT {{jurisdictionCity}}

AFFIDAVIT

I, {{deponentName}}, son/daughter/wife of {{deponentFatherName}}, aged about {{deponentAge}} years, residing at {{deponentAddress}}, do hereby solemnly affirm and state on oath as follows:

1. That I am the citizen/deponent in the above-captioned matter and am fully conversant with the facts stated hereunder.
2. Facts Solemnly Affirmed:
   {{affidavitFacts}}
3. That I have not suppressed any material facts or made any misleading statements before this Hon'ble Authority.
4. That the annexures attached herewith are true certified copies of their respective originals.

VERIFICATION:
Verified at {{jurisdictionCity}} on this {{dateDay}} day of {{dateMonthYear}}, that the contents of paragraphs 1 to 4 of this affidavit are true and correct to the best of my personal knowledge and belief, and nothing material has been concealed therefrom.

DEPONENT:
________________________
({{deponentName}})

Sworn and signed before me:
Oath Commissioner / Notary Public`,
        fieldsSchema: [
          { name: 'jurisdictionCity', label: 'Court / Location City', type: 'text', placeholder: 'e.g. Ernakulam, Kochi' },
          { name: 'deponentName', label: 'Deponent (Your) Full Name', type: 'text', placeholder: 'Your Name' },
          { name: 'deponentFatherName', label: 'Father / Spouse Name', type: 'text', placeholder: 'e.g. Late Mr. K. Sharma' },
          { name: 'deponentAge', label: 'Deponent Age', type: 'text', placeholder: 'e.g. 34' },
          { name: 'deponentAddress', label: 'Deponent Full Address', type: 'text', placeholder: 'Complete residential address' },
          { name: 'affidavitFacts', label: 'Affidavit Facts & Statements', type: 'textarea', placeholder: 'State chronological facts affirmed under oath.' },
          { name: 'dateDay', label: 'Day of Execution', type: 'text', placeholder: 'e.g. 15th' },
          { name: 'dateMonthYear', label: 'Month & Year', type: 'text', placeholder: 'e.g. October, 2026' }
        ]
      }
    ];

    for (const t of defaultList) {
      // Check if template exists by title to prevent duplicate seeding
      const existing = await db.query.documentTemplates.findFirst({
        where: eq(documentTemplates.title, t.title),
      });
      if (!existing) {
        await db.insert(documentTemplates).values({
          title: t.title,
          description: t.description,
          category: t.category,
          contentTemplate: t.contentTemplate,
          fieldsSchema: t.fieldsSchema,
        });
      }
    }
  }
};

export const templatesRouter = router({
  list: publicProcedure.query(async () => {
    await ensureDefaultTemplates();
    return db.select().from(documentTemplates);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const template = await db.query.documentTemplates.findFirst({
        where: eq(documentTemplates.id, input.id),
      });

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      return template;
    }),

  generate: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        filledData: z.record(z.string()),
        caseId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const template = await db.query.documentTemplates.findFirst({
        where: eq(documentTemplates.id, input.templateId),
      });

      if (!template) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
      }

      // Compile content template by replacing {{key}} with filledData[key]
      let compiledContent = template.contentTemplate;
      const schemaFields = template.fieldsSchema as any[];

      for (const field of schemaFields) {
        const value = input.filledData[field.name] || '';
        const regex = new RegExp(`{{${field.name}}}`, 'g');
        compiledContent = compiledContent.replace(regex, value);
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.resolve(__dirname, '../../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `${template.category}_${Date.now()}_${ctx.user.id.substring(0, 8)}.txt`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, compiledContent, 'utf-8');

      // Relative path to store in database
      const dbFilePath = `/uploads/${fileName}`;

      const [generatedDoc] = await db
        .insert(generatedDocuments)
        .values({
          templateId: input.templateId,
          userId: ctx.user.id,
          filledData: input.filledData,
          filePath: dbFilePath,
        })
        .returning();

      // If advocate selected a client's case, automatically attach it to caseDocuments
      let attachedToCase = false;
      if (input.caseId && ctx.user.role === 'advocate') {
        const caseItem = await db.query.cases.findFirst({
          where: eq(cases.id, input.caseId),
        });

        if (caseItem) {
          const stat = fs.statSync(filePath);
          await db.insert(caseDocuments).values({
            caseId: input.caseId,
            uploaderId: ctx.user.id,
            title: `${template.title} (Drafted by Adv. ${ctx.user.name})`,
            filePath: dbFilePath,
            fileType: 'text/plain',
            fileSize: stat.size,
          });
          attachedToCase = true;

          // Notify the citizen client
          if (caseItem.citizenId) {
            try {
              await createNotification({
                userId: caseItem.citizenId,
                type: 'case_update',
                title: 'Legal Document Prepared by Counsel',
                message: `Adv. ${ctx.user.name} prepared and filed "${template.title}" under your case file "${caseItem.title}".`,
                relatedId: caseItem.id,
              });
            } catch (err) {
              console.error('Failed to notify client of document drafting', err);
            }
          }
        }
      }

      return {
        id: generatedDoc.id,
        compiledText: compiledContent,
        filePath: dbFilePath,
        attachedToCase,
        caseId: input.caseId,
      };
    }),

  listUserDocuments: protectedProcedure.query(async ({ ctx }) => {
    return db.query.generatedDocuments.findMany({
      where: eq(generatedDocuments.userId, ctx.user.id),
      with: {
        template: {
          columns: {
            title: true,
            category: true,
          },
        },
      },
      orderBy: (docs, { desc }) => [desc(docs.createdAt)],
    });
  }),

  parseWithAI: publicProcedure
    .input(
      z.object({
        extractedText: z.string(),
        templateTitle: z.string().optional(),
        templateCategory: z.string().optional(),
        fieldsSchema: z.array(z.any()).optional(),
        allTemplates: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              category: z.string(),
              fieldsSchema: z.any().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        return {
          success: false,
          error: 'GROQ_API_KEY environment variable is not configured',
        };
      }
      const models = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

      const systemPrompt = `You are an elite legal document assistant and OCR text entity extraction specialist for the Indian legal system.
Analyze OCR text extracted from physical bills, store invoices, notices, tenancy lease agreements, RTI slips, or sworn court affidavits, and accurately populate the required form fields.

CRITICAL RULES:
1. Always format dates (purchaseDate, noticeDate, date, leaseStartDate, vacateDeadlineDate) as YYYY-MM-DD.
2. For numeric amounts (amountPaid, monthlyRent, compensationAmount), return only numbers without currency symbols or commas.
3. For textareas (disputeDescription, infoRequested, evictionGrounds, affidavitFacts), produce a clear, coherent, legally sound factual narrative based strictly on facts found in the document.
4. For addresses, combine street, locality, city, and pincode if present.
5. If a field cannot be determined, set it to an empty string "".
6. Output ONLY a valid JSON object.`;

      let userPrompt = '';
      const schema = input.fieldsSchema || [];

      if (schema.length > 0) {
        userPrompt = `Active Document Template: "${input.templateTitle || input.templateCategory}" (Category: ${input.templateCategory})

Form Fields Schema:
${JSON.stringify(schema, null, 2)}

Scanned OCR Document Text:
"""
${input.extractedText}
"""

Please extract and populate every field in the schema. Output JSON format:
{
  "${schema[0]?.name || 'field1'}": "value",
  ...other fields,
  "_summary": {
    "Key Label": "Value"
  }
}`;
      } else {
        userPrompt = `Available Legal Templates:
${JSON.stringify(input.allTemplates || [], null, 2)}

Scanned OCR Document Text:
"""
${input.extractedText}
"""

Instructions:
1. Determine which of the available templates best matches this document (categories: consumer, rti, agreement, affidavit).
2. Extract all fields for the chosen template.
3. Output JSON format:
{
  "detectedTemplateId": "id of the best matching template",
  "detectedCategory": "consumer | rti | agreement | affidavit",
  "fields": {
    "fieldName1": "value"
  },
  "_summary": {
    "Key Label": "Value"
  }
}`;
      }

      for (const model of models) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1,
              max_tokens: 1500,
            }),
          });

          if (!res.ok) continue;

          const data = (await res.json()) as any;
          const content = data.choices?.[0]?.message?.content;
          if (!content) continue;

          const parsed = JSON.parse(content);
          let finalFields: Record<string, string> = {};
          const detectedTemplateId = parsed.detectedTemplateId;
          const detectedCategory = parsed.detectedCategory;
          const summary = parsed._summary || {};

          if (schema.length > 0) {
            delete parsed._summary;
            for (const f of schema) {
              const val = parsed[f.name];
              if (val !== undefined && val !== null && String(val).trim() !== '') {
                finalFields[f.name] = String(val).trim();
              }
            }
          } else {
            finalFields = parsed.fields || {};
          }

          finalFields['rawText'] = input.extractedText;
          const matchedKeys = Object.keys(finalFields).filter(k => k !== 'rawText' && finalFields[k]);

          return {
            success: true,
            fields: finalFields,
            matchedKeys,
            summary,
            detectedTemplateId,
            detectedCategory,
            modelUsed: model,
          };
        } catch (err) {
          console.warn(`Backend Groq model ${model} error:`, err);
        }
      }

      return {
        success: false,
        error: 'Groq AI service unavailable',
      };
    }),
});
