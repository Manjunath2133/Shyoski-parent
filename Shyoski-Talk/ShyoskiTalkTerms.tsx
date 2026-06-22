import React from 'react'
import ShyoskiTalkNav from './ShyoskiTalkNav'
import { ChevronLeft } from 'lucide-react'

export default function ShyoskiTalkTerms() {
  return (
    <>
      <ShyoskiTalkNav />
      <main className="min-h-screen bg-futuristic-bg py-28 px-6">
        <div className="w-full max-w-3xl mx-auto bg-white/95 rounded-2xl p-8 shadow-lg prose prose-sm text-sm text-gray-800">
          <div className="flex items-start justify-between doc-header">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">End User Terms of Service</h1>
              <p className="mt-2 text-sm text-gray-500">Last Updated & Effective Date: June 11, 2026</p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => {
                  window.history.pushState(null, '', '/ShyoskiTalk')
                  window.dispatchEvent(new PopStateEvent('popstate'))
                }}
                aria-label="Return to Shyoski Talk"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-800 shadow-sm hover:bg-white/95"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Return</span>
              </button>
            </div>
          </div>

          <article className="doc-content mt-6">
            <h3 className="text-sm font-semibold uppercase text-gray-700">1. Acceptance of Terms</h3>
            <p className="mt-2 text-gray-600">By downloading, installing, accessing, or using ShyoskiTalk ("the App"), you agree to comply with and be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use the App.</p>

            <h3 className="mt-6 text-sm font-semibold uppercase text-gray-700">2. About ShyoskiTalk</h3>
            <p className="mt-2 text-gray-600">ShyoskiTalk is an AI-powered offline multilingual communication application designed to facilitate real-time speech and text translation between users. The App may include features such as real-time speech translation, offline text translation, Conversation Mode, Walkie-Talkie Mode, Bluetooth-based device communication, text-to-speech output, and AI-powered language processing.</p>

            <h3 className="mt-6 text-sm font-semibold uppercase text-gray-700">3. Translation Accuracy Disclaimer</h3>
            <p className="mt-2 text-gray-600">ShyoskiTalk uses artificial intelligence models to generate translations. While we strive to provide accurate and reliable translations, results may not always be perfect. Translations may contain contextual inaccuracies, grammatical errors, or incorrect interpretations. Do not rely solely on ShyoskiTalk for medical, legal, financial, emergency, or other safety-critical communications; you remain responsible for verifying important information.</p>

            <h3 className="mt-6 text-sm font-semibold uppercase text-gray-700">4. Privacy and Data Processing</h3>
            <p className="mt-2 text-gray-600">ShyoskiTalk is designed to process translations primarily on-device whenever possible. We do not intentionally collect, store, sell, or share personal conversation data unless explicitly stated in a separate Privacy Policy. Users are responsible for protecting their devices and the security of their information.</p>

            <h3 className="mt-6 text-sm font-semibold uppercase text-gray-700">5. Device Requirements</h3>
            <p className="mt-2 text-gray-600">For optimal performance, users should use devices that meet the recommended hardware requirements. Older or low-memory devices may experience slower translations, increased latency, reduced responsiveness, or application instability.</p>

            <h3 className="mt-6 text-sm font-semibold uppercase text-gray-700">6. Limitation of Liability</h3>
            <p className="mt-2 text-gray-600">To the maximum extent permitted by law, ShyoskiTalk and its developers shall not be liable for translation inaccuracies, data loss, device malfunctions, business or personal losses, or indirect or consequential damages arising from use of the App. Use of the App is at your own risk.</p>

            <div className="mt-8 border-t pt-6 text-sm text-gray-600">
              <p>If you have questions about these Terms, contact the Shyoski Team at <a href="mailto:support@shyoski.com" className="text-blue-600 underline">support@shyoski.com</a>.</p>
            </div>
          </article>
      </div>
    </main>
    </>
  )
}
