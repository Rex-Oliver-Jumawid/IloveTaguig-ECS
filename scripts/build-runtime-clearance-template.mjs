import { readFile, writeFile } from 'node:fs/promises'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const input = 'assets/templates/acroformtemplates/BARANGAY_CLEARANCE_fillable_template.pdf'
const output = 'assets/templates/acroformtemplates/BARANGAY_CLEARANCE_runtime_template.pdf'
const pdf = await PDFDocument.load(await readFile(input))
const form = pdf.getForm()
const page = pdf.getPage(0)
const font = await pdf.embedFont(StandardFonts.Helvetica)

for (const fieldDefinition of [
  { name: 'validity_date', x: 150, y: 218, width: 102, height: 18, size: 11 },
  { name: 'approved_by', x: 648, y: 77, width: 232, height: 22, size: 10 },
]) {
  if (form.getFields().some((field) => field.getName() === fieldDefinition.name)) continue
  const field = form.createTextField(fieldDefinition.name)
  field.addToPage(page, {
    x: fieldDefinition.x,
    y: fieldDefinition.y,
    width: fieldDefinition.width,
    height: fieldDefinition.height,
    font,
    textColor: rgb(0, 0, 0),
    backgroundColor: rgb(1, 1, 1),
    borderColor: rgb(1, 1, 1),
    borderWidth: 0,
  })
  field.setFontSize(fieldDefinition.size)
}

await writeFile(output, await pdf.save())
console.log(`Created ${output} with ${form.getFields().length} fields.`)
