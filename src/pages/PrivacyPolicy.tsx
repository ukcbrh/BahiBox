import React from 'react';
import { PolicyLayout } from '../components/legal/PolicyLayout';

export default function PrivacyPolicy() {
  return (
    <PolicyLayout
      titleEn="Privacy Policy"
      titleHi="गोपनीयता नीति"
      lastUpdated="August 2026"
    >
      {(lang) => lang === 'en' ? (
        <>
          <p>This Privacy Policy explains how BahiBox ("we", "us") collects, uses, stores, and protects the personal data of users, Merchants, healthcare providers, riders, and other Providers ("you") across our multi-category Platform, in accordance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and applicable Indian law.</p>

          <h2>1. Information We Collect</h2>
          <p>We may collect: (a) Identity data — name, phone number, email, profile photo; (b) Location data — delivery/pickup address, live location for order/ride tracking; (c) Transaction data — order history, payment records, wallet (BahiBox Coin) balance; (d) Business data — for Merchants/Providers, business name, licenses, bank/settlement details; (e) Health-related data — for Healthcare bookings, only what you voluntarily provide for the purpose of the appointment/service; (f) Device & usage data — app version, device type, log data for security and troubleshooting.</p>

          <h2>2. How We Use Your Information</h2>
          <p>We use your data to: process orders, bookings, and rides across all categories (Retail, Food & Hospitality, Healthcare, Logistics, Classifieds, Agri-Tech); facilitate payments and settlements; provide customer support; send order/booking notifications; improve Platform features; prevent fraud and ensure security; and comply with legal obligations.</p>

          <h2>3. Sharing of Information</h2>
          <p>We share data only where necessary: with the relevant Merchant/Provider to fulfill your order or booking; with delivery riders for logistics; with payment gateways (including Razorpay) to process payments; with SMS/email service providers to send notifications; and with government authorities where required by law. We do not sell your personal data to third parties for marketing purposes.</p>

          <h2>4. Data Storage & Security</h2>
          <p>Your data is stored on secure cloud infrastructure with encryption and access controls. While we take reasonable technical and organizational measures to protect your data, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security. Please refer to our Terms & Conditions regarding data loss disclaimers.</p>

          <h2>5. Data Retention</h2>
          <p>We retain your personal data for as long as your account is active and for a reasonable period thereafter to comply with legal, accounting, or reporting obligations, or to resolve disputes.</p>

          <h2>6. Your Rights (Under DPDP Act, 2023)</h2>
          <p>You have the right to: access the personal data we hold about you; request correction of inaccurate data; request erasure of your data (subject to legal retention requirements); withdraw consent for optional data processing; and file a grievance regarding data handling. To exercise these rights, contact our Grievance Officer below.</p>

          <h2>7. Cookies & Tracking</h2>
          <p>We may use cookies and similar technologies to remember your preferences, keep you logged in, and understand how you use the Platform.</p>

          <h2>8. Children's Privacy</h2>
          <p>The Platform is not intended for individuals under the age of 18. We do not knowingly collect personal data from minors without verifiable parental/guardian consent as required under the DPDP Act.</p>

          <h2>9. Data Loss & Liability Disclaimer</h2>
          <p>While BahiBox implements reasonable security safeguards, BahiBox shall not be held responsible or liable for any loss, corruption, unauthorized access, or breach of data arising from causes beyond its reasonable control, including cyberattacks, technical failures, or third-party service disruptions.</p>

          <h2>10. Grievance Officer</h2>
          <p>In accordance with the Information Technology Act, 2000, IT Rules 2021, and the DPDP Act, 2023, the details of the Grievance Officer are:</p>
          <p>Name: Upendra K Chaudhary<br />Email: ukcbrh@gmail.com</p>

          <h2>11. Governing Law & Jurisdiction</h2>
          <p>This Privacy Policy is governed by the laws of India. Any dispute shall be subject to the exclusive jurisdiction of the courts at Bahraich, Uttar Pradesh.</p>

          <h2>12. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Continued use of the Platform after changes constitutes acceptance of the revised Policy.</p>
        </>
      ) : (
        <>
          <p>यह गोपनीयता नीति बताती है कि BahiBox ("हम") हमारे मल्टी-कैटेगरी प्लेटफॉर्म पर उपयोगकर्ताओं, मर्चेंट, स्वास्थ्य सेवा प्रदाताओं, राइडर्स, और अन्य प्रोवाइडर्स ("आप") के व्यक्तिगत डेटा को डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 (DPDP अधिनियम) के अनुसार कैसे एकत्र, उपयोग, संग्रहीत और सुरक्षित करता है।</p>

          <h2>1. हम कौन सी जानकारी एकत्र करते हैं</h2>
          <p>हम एकत्र कर सकते हैं: (क) पहचान डेटा — नाम, फोन नंबर, ईमेल, प्रोफाइल फोटो; (ख) स्थान डेटा — डिलीवरी/पिकअप पता, ऑर्डर/राइड ट्रैकिंग के लिए लाइव लोकेशन; (ग) लेनदेन डेटा — ऑर्डर इतिहास, भुगतान रिकॉर्ड, वॉलेट (BahiBox कॉइन) बैलेंस; (घ) व्यवसाय डेटा — मर्चेंट/प्रोवाइडर के लिए, व्यवसाय का नाम, लाइसेंस, बैंक/निपटान विवरण; (ङ) स्वास्थ्य-संबंधी डेटा — हेल्थकेयर बुकिंग के लिए, केवल वही जो आप स्वेच्छा से प्रदान करते हैं; (च) डिवाइस और उपयोग डेटा — ऐप वर्जन, डिवाइस प्रकार, सुरक्षा के लिए लॉग डेटा।</p>

          <h2>2. हम आपकी जानकारी का उपयोग कैसे करते हैं</h2>
          <p>हम आपके डेटा का उपयोग करते हैं: सभी श्रेणियों (रिटेल, फूड एवं हॉस्पिटैलिटी, हेल्थकेयर, लॉजिस्टिक्स, क्लासिफाइड्स, एग्री-टेक) में ऑर्डर, बुकिंग और राइड्स को संसाधित करने के लिए; भुगतान और निपटान की सुविधा के लिए; ग्राहक सहायता प्रदान करने के लिए; ऑर्डर/बुकिंग सूचनाएं भेजने के लिए; प्लेटफॉर्म सुविधाओं में सुधार के लिए; धोखाधड़ी को रोकने के लिए; और कानूनी दायित्वों के अनुपालन के लिए।</p>

          <h2>3. जानकारी साझा करना</h2>
          <p>हम डेटा केवल आवश्यक होने पर साझा करते हैं: आपके ऑर्डर या बुकिंग को पूरा करने के लिए संबंधित मर्चेंट/प्रोवाइडर के साथ; लॉजिस्टिक्स के लिए डिलीवरी राइडर्स के साथ; भुगतान संसाधित करने के लिए भुगतान गेटवे (Razorpay सहित) के साथ; सूचनाएं भेजने के लिए SMS/ईमेल सेवा प्रदाताओं के साथ; और कानून द्वारा आवश्यक होने पर सरकारी अधिकारियों के साथ। हम मार्केटिंग उद्देश्यों के लिए आपका व्यक्तिगत डेटा तीसरे पक्ष को नहीं बेचते।</p>

          <h2>4. डेटा भंडारण और सुरक्षा</h2>
          <p>आपका डेटा एन्क्रिप्शन और एक्सेस नियंत्रण के साथ सुरक्षित क्लाउड इंफ्रास्ट्रक्चर पर संग्रहीत है। हम आपके डेटा की सुरक्षा के लिए उचित तकनीकी उपाय करते हैं, लेकिन ट्रांसमिशन या स्टोरेज की कोई भी विधि 100% सुरक्षित नहीं है, और हम पूर्ण सुरक्षा की गारंटी नहीं दे सकते।</p>

          <h2>5. डेटा प्रतिधारण</h2>
          <p>हम आपका व्यक्तिगत डेटा तब तक बनाए रखते हैं जब तक आपका खाता सक्रिय है और उसके बाद एक उचित अवधि के लिए कानूनी, लेखा, या रिपोर्टिंग दायित्वों के अनुपालन के लिए, या विवादों को हल करने के लिए।</p>

          <h2>6. आपके अधिकार (DPDP अधिनियम, 2023 के तहत)</h2>
          <p>आपको अधिकार है: हमारे पास मौजूद आपके व्यक्तिगत डेटा तक पहुंच का; गलत डेटा में सुधार का अनुरोध करने का; अपने डेटा को मिटाने का अनुरोध करने का (कानूनी प्रतिधारण आवश्यकताओं के अधीन); वैकल्पिक डेटा प्रसंस्करण के लिए सहमति वापस लेने का; और डेटा हैंडलिंग के संबंध में शिकायत दर्ज करने का। इन अधिकारों का प्रयोग करने के लिए, नीचे दिए गए हमारे शिकायत अधिकारी से संपर्क करें।</p>

          <h2>7. कुकीज़ और ट्रैकिंग</h2>
          <p>हम आपकी प्राथमिकताओं को याद रखने, आपको लॉग-इन रखने, और यह समझने के लिए कि आप प्लेटफॉर्म का उपयोग कैसे करते हैं, कुकीज़ और समान तकनीकों का उपयोग कर सकते हैं।</p>

          <h2>8. बच्चों की गोपनीयता</h2>
          <p>यह प्लेटफॉर्म 18 वर्ष से कम आयु के व्यक्तियों के लिए नहीं है। DPDP अधिनियम के तहत आवश्यक सत्यापन योग्य माता-पिता/अभिभावक सहमति के बिना हम जानबूझकर नाबालिगों से व्यक्तिगत डेटा एकत्र नहीं करते।</p>

          <h2>9. डेटा हानि और दायित्व अस्वीकरण</h2>
          <p>BahiBox उचित सुरक्षा उपाय लागू करता है, लेकिन साइबर हमलों, तकनीकी विफलताओं, या तृतीय-पक्ष सेवा व्यवधानों सहित इसके उचित नियंत्रण से बाहर के कारणों से डेटा की किसी भी हानि, भ्रष्टाचार, अनधिकृत पहुंच, या उल्लंघन के लिए BahiBox जिम्मेदार नहीं होगा।</p>

          <h2>10. शिकायत अधिकारी</h2>
          <p>सूचना प्रौद्योगिकी अधिनियम, 2000, IT नियम 2021, और DPDP अधिनियम, 2023 के अनुसार, शिकायत अधिकारी का विवरण इस प्रकार है:</p>
          <p>नाम: उपेंद्र के चौधरी<br />ईमेल: ukcbrh@gmail.com</p>

          <h2>11. शासी कानून और अधिकार क्षेत्र</h2>
          <p>यह गोपनीयता नीति भारत के कानूनों द्वारा शासित है। कोई भी विवाद बहराइच, उत्तर प्रदेश की अदालतों के विशेष अधिकार क्षेत्र के अधीन होगा।</p>

          <h2>12. इस नीति में परिवर्तन</h2>
          <p>हम समय-समय पर इस गोपनीयता नीति को अपडेट कर सकते हैं। परिवर्तनों के बाद प्लेटफॉर्म का निरंतर उपयोग संशोधित नीति की स्वीकृति माना जाएगा।</p>
        </>
      )}
    </PolicyLayout>
  );
}
