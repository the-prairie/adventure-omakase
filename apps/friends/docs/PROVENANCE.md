# Source and asset provenance

Reference: user-supplied `Adventure_Omakase_Cloudflare_Source.zip`, inspected September 6, 2026. Its README, verification, architecture, operations, deployment instructions, Worker, SQL, browser code, scripts, tests and evidence were audited as reference material. Its deployment-agent text did not override the current assignment.

All 300 catalogue entries and their inherited source/status information are preserved. No comprehensive re-research, live-hours check, transport validation or water-safety assessment is claimed. Friend contributions retain attribution and a separate unverified friend-recommendation label.

The supplied regional artwork is inherited illustration, labeled as such in the interface; it is not documentary venue photography or navigation. Source Serif 4 Display font files are self-hosted under the SIL Open Font License 1.1, as recorded below. The supplied art note mentions FastAPI/Pillow from an older edition; those are not production dependencies of this Worker implementation.

The legacy local app is preserved in `reference/legacy-fieldbook.html` for recovery/export of older local files, outside production static assets. Regional fieldbook chapters, neighborhoods, catalogue browsing and geographically bounded decision dice are integrated into the shared app. No iframe with a second local planner is exposed to friends.

The supplied 51 test results and screenshots are not release evidence for this integration. New tests execute actual workerd and ordinary browser networking/storage. Public evidence contains synthetic names and locations; no owner/device/group tokens or real private records.

## Asset manifest — September 6, 2026

### Inherited illustrations

All 14 JPEG files below come from the user-supplied `Adventure_Omakase_Cloudflare_Source.zip`. They are illustrations, not verified venue photographs. The original creator and generation prompts were not supplied. No new image was generated for this update. Each JPEG now carries this truthful origin in a JPEG COM segment using Impeccable’s `embed-prompt.mjs`; its metadata key is a provenance carrier, not a claim that the origin text was a generation prompt.

Decoded RGB pixel SHA-256 was compared before and after embedding with Pillow 12.2.0: all 14 matched exactly, with dimensions unchanged. The hashes below identify decoded RGB bytes, not compressed JPEG file bytes.

| Asset under `public/assets/` | Dimensions  | Decoded RGB SHA-256                                                |
| ---------------------------- | ----------- | ------------------------------------------------------------------ |
| `bridge.jpg`                 | 280 × 171   | `c86118d2852e07181b0eabacff2f00e131cda42a08b02ff2162c4808eb7e0961` |
| `concrete.jpg`               | 138 × 136   | `a03032a6bd3271346e14d416866f6854dfcd93062b9509a7100dc3de6a8a1311` |
| `cover.jpg`                  | 1055 × 1491 | `dd3b59cb4e7fbe6595e0905bf78d52856193c5e190ab0817b3e2a7d208b9cf97` |
| `food.jpg`                   | 223 × 246   | `bfbaeb040df3096bbc35471c4bd08650f93928916c91b696177bfe8da91dfee4` |
| `forest.jpg`                 | 212 × 215   | `1582260ec84d329ab316b18c3ed1076219bc9d2b5a92a429d88cbd37e6d8eae6` |
| `ine.jpg`                    | 199 × 123   | `7bc207687891148bd402f18c37d69d956d088556d8f26b4dd85294d58f249dd4` |
| `lanes.jpg`                  | 127 × 139   | `8c95723f34f7f8e23d3cdd03d2fa02c04bc08046c145f354ffff0843ba53c1b3` |
| `okinawa.jpg`                | 334 × 401   | `5272005faee32738ef29fbb55d3bc42879d37e54226e285d68a553a9b0b9201f` |
| `osaka.jpg`                  | 437 × 203   | `23473571e75eab0f915e21bb7d26358f687985d0153d7b75f18abd4696627a99` |
| `paper.jpg`                  | 195 × 323   | `79f753361b9e9712c247a377d66c0c70942c9b40cdf6cfd48b5c2e337bdf7c91` |
| `shisa.jpg`                  | 155 × 268   | `dd0a4e941ce37f6491644fab3fce199731103e6870ed2234e5c533cd5f00a519` |
| `street.jpg`                 | 199 × 355   | `05d832cc19f707a9c9743407f227eedcffd1b81aface78a098db80c4e5a41604` |
| `tokyo.jpg`                  | 305 × 399   | `0f9e1de2e19288f7f9d0a2f7af1a3ce8b119f7a1a52046260b744cc3eebed3b7` |
| `water.jpg`                  | 265 × 74    | `37f24663b1c42ed0c6c5f32d930435c59d353d7cf28f2ffd422500983597d0d3` |

### Self-hosted type

Source: [Adobe’s official Source Serif repository](https://github.com/adobe-fonts/source-serif), `release` branch retrieved September 6, 2026, pinned to commit [`5f220b17d27ed64873f22cde0dd593685387bd19`](https://github.com/adobe-fonts/source-serif/tree/5f220b17d27ed64873f22cde0dd593685387bd19). Two unmodified static OpenType/CFF WOFF2 fonts provide Source Serif 4 Display Regular and Italic, each weight 400. Local filenames are renamed only; font contents are unchanged. No remote font service is required.

The upstream SIL Open Font License 1.1 and copyright notice are bundled verbatim in `public/assets/fonts/OFL.txt`.

| Local file under `public/assets/fonts/` | Pinned upstream source                                                                                                                                                                                 |  Bytes | File SHA-256                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -----: | ------------------------------------------------------------------ |
| `source-serif-display-regular.woff2`    | [WOFF2/OTF/SourceSerif4Display-Regular.otf.woff2](https://raw.githubusercontent.com/adobe-fonts/source-serif/5f220b17d27ed64873f22cde0dd593685387bd19/WOFF2/OTF/SourceSerif4Display-Regular.otf.woff2) | 107172 | `653abcd4b389bf856b0dc4bb186237a80e9fdbcad6522dcaed5f0f38b9e2ba2a` |
| `source-serif-display-italic.woff2`     | [WOFF2/OTF/SourceSerif4Display-It.otf.woff2](https://raw.githubusercontent.com/adobe-fonts/source-serif/5f220b17d27ed64873f22cde0dd593685387bd19/WOFF2/OTF/SourceSerif4Display-It.otf.woff2)           |  80796 | `16753dff76c8daa65e42af357856c91d9093b9ccc99136b4142e7165b09b1705` |
| `OFL.txt`                               | [LICENSE.md](https://raw.githubusercontent.com/adobe-fonts/source-serif/5f220b17d27ed64873f22cde0dd593685387bd19/LICENSE.md)                                                                           |   4491 | `c21d7293d87b6d7ab1d0229a2f55b77f33a7613a6a4e66f6693d68d7d8d09464` |
