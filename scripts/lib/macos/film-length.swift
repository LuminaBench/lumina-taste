// How long a film is, in seconds. macOS only (AVFoundation), nothing to install.
//   swift film-length.swift <film>
import AVFoundation
let a = CommandLine.arguments
guard a.count >= 2 else { exit(2) }
let s = CMTimeGetSeconds(AVURLAsset(url: URL(fileURLWithPath: a[1])).duration)
guard s.isFinite, s > 0 else { exit(1) }
print(s)
