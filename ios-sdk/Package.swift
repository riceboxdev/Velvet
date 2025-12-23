// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "Velvet",
    platforms: [
        .iOS(.v15),
        .macOS(.v12)
    ],
    products: [
        .library(
            name: "Velvet",
            targets: ["Velvet"]
        ),
    ],
    targets: [
        .target(
            name: "Velvet",
            dependencies: []
        ),
        .testTarget(
            name: "VelvetTests",
            dependencies: ["Velvet"]
        ),
    ]
)
