# Warble

Warble is a browser-focused library for short-range data broadcast and channels using synthetic birdsong. My goal is to offer atmospheric, cheery, and unintrusive communication that is portable across different browsers and devices.

The first proof of concept is currently being cleaned up and refactored for an experimental release. You are welcome to watch for changes in the `dev` branch, but this is all a long way from being useful in a real application.

## Questions

**Why audible sound?**

Browser vendors have been very reluctant to let web pages directly access any of the many wireless devices present in a modern cellphone or laptop, citing both security and privacy risks. Sound playback and recording, however, is available across all major browsers through the WebAudio API, and processing with Audio Worklets and WASM is impressively efficient. Inaudible sound presents similar risks to wireless access, so it would not be a surprise if browsers or devices eventually act to filter it out.

**Why birdsong?**

Birdsong is familiar. If you're outdoors, even in an urban setting, there are probably little birds that pipe up occasionally. Hearing them while indoors is not that strange, hopefully through an open window. Our devices adding an occasional little song or chirp might not even be noticed by other people.

Moreover, birdsong is cheery and fun. Follow some of the birdsong links below, like the [American Goldfinch](https://macaulaylibrary.org/asset/230747651). Whatever they're singing about, it says that things are calm and safe. Possibly that it's a beautiful sunny day and any over-stressed primates should be napping under a tree.

But seriously, of all the sounds we could be making randomly, occasional birdsong seems the least likely to annoy other people, and fits well with fun, quirky experiences that inspire curiosity and joy.

**How does this relate to wired and wireless networks?**

This project is closely related to digital networking, and especially the classic dial-up modems that communicate data over voice-only phone lines. These technologies usually have the concept of a carrier signal, which is modulated (rapidly adjusted) to transmit data, and demodulated at the receiver (a "modem" is a "**mo**dulator/**dem**odulator").

The initial intuition of this project was that birdsong could act as a carrier, and subtle modulation of that carrier could communicate data without being noticed by casual listeners. A very early prototype currently suggests that is plausible, but the prototype is not stable enough for real-world experiments. Work is underway to share a public proof of concept that should transfer about 512 bits of data in 2 seconds of simple birdsong. More advanced techniques will then be able to increase the variety of song, transfer speed, and tolerance to background noise.

**How does this relate to audio steganography or watermarking?**

Techniques for hiding one signal inside another are generally referred to as steganography. This project hides data within innocent sounds, so can reasonably be considered a kind of audio steganography. However, my quick survey of the field shows they are addressing the harder problem of modifying arbitrary sounds, which complicates both processing and error correction.

Audio watermarking is another subset of audio steganography, focused on hiding small identifying codes that survive edits to the sound. Their focus on amazing durability and error correction makes watermarks even lower bandwidth and higher complexity than general audio steganography.

## Protocol Roadmap

- Short message broadcast: Broadcast short text messages to listeners.

- Short message exchange: Truly serverless WebRTC signaling.

- Collision detection: Adaptive backoff and retry.

- Forward error correction: Reduce retries in noisy spaces.

- Dynamic volume levels: Reduce annoyance in quiet spaces.

- Streaming message exchange: Linux tun/tap for practical [Transmission of IP Datagrams on Avian Carriers](https://www.rfc-editor.org/rfc/rfc1149).

- Bring your own sound: The same techniques used to piggyback data on birdsong should work with some sound effects and music.

- Intelligent variety: Balance unintrusive sounds with novelty and importance.

## Birdsong Roadmap

The Cornell Lab provides a [nice overview](https://www.allaboutbirds.org/news/how-to-use-spectrograms-learn-bird-songs/) of the kinds of birdsong and some terminology. We will be exploring the types of song in a similar order:

- Whistles at a fixed pitch; e.g. [Harris's Sparrow](https://macaulaylibrary.org/asset/92796451).

- Whistles at different pitches; e.g. [Black-capped Chickadee](https://macaulaylibrary.org/asset/217850561).

- Whistles that slide between pitches; e.g. [Northern Cardinal](https://macaulaylibrary.org/asset/96661961).

- Warbling songs; e.g. [Rose-breasted Grosbeak](https://macaulaylibrary.org/asset/261929461).

- Chips and buzzes; e.g. [Red-winged Blackbird](https://macaulaylibrary.org/asset/94242).

- Complex songs; e.g. [American Goldfinch](https://macaulaylibrary.org/asset/230747651).

Part of this work will be ensuring that the generated songs do not trigger bird identification apps, so hopefully also avoid distracting real birds.

## License and Warranty Disclaimer

```
MIT License

Copyright (c) 2026 Chris Wolfe <https://crlfe.ca/>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
