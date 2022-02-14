process.env.NTBA_FIX_319 = 1;

const { degrees, PDFDocument, rgb, StandardFonts } = require('pdf-lib')
const fontkit = require('@pdf-lib/fontkit')
const TelegramBot = require('node-telegram-bot-api')
const fetch = require('node-fetch')
const fs = require('fs')

const token = '5089281192:AAHLUspjfxhXUJD34XWF9mqJMXIduGvlziw'
const bot = new TelegramBot(token, { polling: true })

let price = ''
let pdfDoc = null
let fileName = ''

bot.on('document', async (msg) => {
    const chatId = msg.chat.id

    if (msg.document.mime_type == 'application/pdf') {
        fileName = msg.document.file_name
        const url = await bot.getFileLink(msg.document.file_id)
        const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer())
        pdfDoc = await PDFDocument.load(existingPdfBytes)
        bot.sendMessage(chatId, 'Введите цену:')
    } else {
        bot.sendMessage(chatId, 'Недопустимый формат файла. Для редактирования загрузите файл в формате ".pdf".')
    }
})

bot.on('text', async (msg) => {
    const chatId = msg.chat.id

    if (pdfDoc != null) {
        price = msg.text;

        pdfDoc.registerFontkit(fontkit)
        const fontBytes = await getFont()
        const font = await pdfDoc.embedFont(fontBytes)

        const logoBytes = await getLogo()
        const logo = await pdfDoc.embedJpg(logoBytes)
        const pages = pdfDoc.getPages()

        for (let i = 0; i < pages.length; i++) {
            const pageHeight = pages[i].getHeight()
            const pageWidth = pages[i].getWidth()

            pages[i].drawImage(logo, {
                x: 32,
                y: pageHeight - 60,
                width: 120,
                height: 35
            })

            pages[i].drawRectangle({
                x: pageWidth - 100,
                y: pageHeight - 60,
                width: 100,
                height: 35,
                color: rgb(1, 1, 1),
            })

            if (i == 0) {
                pages[i].drawText(price, {
                    x: pageWidth - 112,
                    y: pageHeight - 161,
                    size: 9,
                    font: font,
                    color: rgb(0, 0, 0),
                })
            }
        }

        const pdfBytes = await pdfDoc.save()

        await addFile(fileName, pdfBytes)
        await bot.sendDocument(chatId, './files/' + fileName)
        await removeFile(fileName)

        pdfDoc = null;
    } else {
        bot.sendMessage(chatId, 'Отправьте файл для редактирования.')
    }
})


async function getFont() {
    return await fs.promises.readFile('./fonts/Helvetica.otf');
}

async function getLogo() {
    return await fs.promises.readFile('./img/logo.jpeg');
}

async function addFile(name, data) {
    return await fs.promises.writeFile('./files/' + name, data)
}

async function removeFile(name) {
    return await fs.promises.unlink('./files/' + name);
}
