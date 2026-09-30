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
const ensureDefaultTemplates = async () => {
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
      }
    ];

    for (const t of defaultList) {
      await db.insert(documentTemplates).values({
        title: t.title,
        description: t.description,
        category: t.category,
        contentTemplate: t.contentTemplate,
        fieldsSchema: t.fieldsSchema,
      });
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
});
export type { ensureDefaultTemplates };
