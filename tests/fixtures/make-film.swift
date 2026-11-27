// A small test film, drawn frame by frame (no video file is kept in the repo): a warm ground with a bar moving across.
//   swift make-film.swift <out.mov> [seconds]
import AVFoundation
import CoreGraphics
let a = CommandLine.arguments
let out = URL(fileURLWithPath: a[1]); try? FileManager.default.removeItem(at: out)
let secs = a.count > 2 ? Int(a[2]) ?? 10 : 10
let W = 1280, H = 720, fps: Int32 = 24
let w = try! AVAssetWriter(outputURL: out, fileType: .mov)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H])
let ad = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
w.add(input); w.startWriting(); w.startSession(atSourceTime: .zero)
for f in 0..<(Int(fps) * secs) {
  while !input.isReadyForMoreMediaData { usleep(1000) }
  var pb: CVPixelBuffer?; CVPixelBufferPoolCreatePixelBuffer(nil, ad.pixelBufferPool!, &pb)
  CVPixelBufferLockBaseAddress(pb!, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: W, height: H, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb!), space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
  let t = Double(f) / Double(fps)
  ctx.setFillColor(CGColor(red: 0.14, green: 0.1, blue: 0.08, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
  ctx.setFillColor(CGColor(red: 0.96, green: 0.86, blue: 0.7, alpha: 1)); ctx.fill(CGRect(x: t / Double(secs) * Double(W - 160), y: 300, width: 160, height: 120))
  CVPixelBufferUnlockBaseAddress(pb!, [])
  ad.append(pb!, withPresentationTime: CMTime(value: Int64(f), timescale: fps))
}
input.markAsFinished(); let g = DispatchGroup(); g.enter(); w.finishWriting { g.leave() }; g.wait()
exit(w.status == .completed ? 0 : 1)
