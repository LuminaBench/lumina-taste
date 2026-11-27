// The text of a PDF, page by page in reading order. macOS only (PDFKit), nothing to install.
//   swift pdf-text.swift <file.pdf>
import PDFKit

let a = CommandLine.arguments
guard a.count >= 2, let doc = PDFDocument(url: URL(fileURLWithPath: a[1])) else { FileHandle.standardError.write("Could not open the PDF\n".data(using: .utf8)!); exit(1) }
for i in 0..<doc.pageCount { if let s = doc.page(at: i)?.string { print(s) } }
