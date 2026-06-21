import { readFile, writeFile } from 'node:fs/promises'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const sourcePath = 'assets/templates/BARANGAY BUSINESS CLEARANCE.pdf'
const outputPath = 'assets/templates/barangay-clearance-form.pdf'

const pdf = await PDFDocument.load(await readFile(sourcePath))
const page = pdf.getPage(0)
const form = pdf.getForm()
const font = await pdf.embedFont(StandardFonts.Helvetica)

const fields = [
  ['applicant_owner_name', 36, 371, 505, 18, 12],
  ['business_name', 82, 350, 459, 18, 12],
  ['business_address', 85, 329, 456, 18, 11],
  ['validity_date', 150, 218, 102, 18, 11, true],
  ['issued_day', 90, 195, 63, 18, 11],
  ['issued_month', 191, 195, 125, 18, 11],
  ['reference_number', 126, 126, 162, 18, 10],
  ['ownership_type', 143, 104, 145, 18, 10],
  ['application_type_status', 86, 81, 202, 18, 10],
  ['clerk_initials', 126, 57, 162, 18, 10],
  ['approved_by', 648, 77, 232, 22, 10, true],
]

for (const [name, x, y, width, height, size, opaque = false] of fields) {
  const field = form.createTextField(name)
  field.addToPage(page, {
    x,
    y,
    width,
    height,
    font,
    textColor: rgb(0, 0, 0),
    backgroundColor: opaque ? rgb(1, 1, 1) : undefined,
    borderColor: rgb(1, 1, 1),
    borderWidth: 0,
  })
  field.setFontSize(size)
}

await writeFile(outputPath, await pdf.save())
console.log(`Created ${outputPath} with ${form.getFields().length} AcroForm fields.`)
