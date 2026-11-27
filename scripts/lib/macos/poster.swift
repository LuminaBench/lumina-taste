// The still for a film: one frame at a time in seconds, as a JPEG. macOS only (AVFoundation), nothing to install.
//   swift poster.swift <film> <out.jpg> <seconds> [maxWidth]
import AVFoundation
import AppKit

let a = CommandLine.arguments
guard a.count >= 4, let at = Double(a[3]) else { FileHandle.standardError.write("usage: poster.swift <film> <out.jpg> <seconds> [maxWidth]\n".data(using: .utf8)!); exit(2) }
let maxWidth = a.count > 4 ? Double(a[4]) ?? 1600 : 1600
let gen = AVAssetImageGenerator(asset: AVURLAsset(url: URL(fileURLWithPath: a[1])))
gen.appliesPreferredTrackTransform = true
gen.maximumSize = CGSize(width: maxWidth, height: maxWidth * 4)
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = CMTime(seconds: 0.5, preferredTimescale: 600)
do {
  let img = try gen.copyCGImage(at: CMTime(seconds: at, preferredTimescale: 600), actualTime: nil)
  let rep = NSBitmapImageRep(cgImage: img)
  guard let jpg = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.82]) else { exit(1) }
  try jpg.write(to: URL(fileURLWithPath: a[2]))
  print("\(img.width) \(img.height)")
} catch { FileHandle.standardError.write("\(error.localizedDescription)\n".data(using: .utf8)!); exit(1) }
