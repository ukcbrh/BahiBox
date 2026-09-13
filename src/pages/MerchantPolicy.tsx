import React from 'react';
import { PolicyLayout } from '../components/legal/PolicyLayout';

export default function MerchantPolicy() {
  return (
    <PolicyLayout
      titleEn="Merchant Terms & Conditions"
      titleHi="मर्चेंट नियम एवं शर्तें"
      lastUpdated="August 2026"
    >
      {(lang) => lang === 'en' ? (
        <>
          <p>This Merchant Agreement governs your use of the BahiBox platform ("Platform") as a merchant, restaurant, hotel, or service provider ("Merchant"). By registering, you agree to be bound by these Terms.</p>

          <h2>1. Nature of Relationship</h2>
          <p>BahiBox is a technology platform that connects Merchants with customers. BahiBox is an independent intermediary and is not a party to any sale, transaction, or agreement between the Merchant and the customer. Nothing in this Agreement creates an employment, partnership, agency, or joint-venture relationship between BahiBox and the Merchant.</p>

          <h2>2. Merchant Responsibilities</h2>
          <p>The Merchant, healthcare provider, service provider, rider, or third-party lister ("Provider") is solely responsible for: (a) accuracy of product/menu/room/listing details, pricing, and stock/availability across all categories including Retail, Food & Hospitality, Healthcare, Logistics, Classifieds, and Agri-Tech; (b) quality, safety, medical accuracy, ride safety, freshness, authenticity, and legality of all products, food, healthcare services, rides, and listings offered; (c) obtaining and maintaining all licenses, FSSAI registration, medical/professional registration, GST registration, driving/vehicle permits, and other regulatory approvals required to operate their business; (d) timely fulfillment of orders, bookings, and services; and (e) compliance with all applicable laws.</p>

          <h2>3. Commission & Fees</h2>
          <p>BahiBox will charge a commission/subscription fee as communicated to the Merchant at the time of onboarding or as updated from time to time. BahiBox reserves the right to modify commission structures or platform fees with reasonable prior notice to Merchants.</p>

          <h2>4. Payments & Settlements</h2>
          <p>Payments collected from customers are processed via third-party payment gateways (including Razorpay) and settled to the Merchant's registered bank account or wallet as per the Platform's settlement cycle. BahiBox is not liable for delays caused by the payment gateway, banking partner, or incorrect bank details provided by the Merchant.</p>

          <h2>5. Data Loss Disclaimer</h2>
          <p>While BahiBox takes reasonable technical measures to protect Merchant data (including sales records, inventory, and customer information processed through the Platform), BahiBox shall not be held responsible or liable for any loss, corruption, unauthorized access, or deletion of data arising from technical failure, server downtime, cyberattack, third-party breach, or events beyond BahiBox's reasonable control. Merchants are advised to independently maintain their own business records and backups.</p>

          <h2>6. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, BahiBox's total liability to the Merchant arising out of or relating to this Agreement shall not exceed the total commission/fees paid by the Merchant to BahiBox in the preceding three (3) months. BahiBox shall not be liable for any indirect, incidental, special, or consequential damages, including loss of profits or business.</p>

          <h2>7. Indemnification</h2>
          <p>The Merchant agrees to indemnify and hold harmless BahiBox, its owners, employees, and affiliates from any claims, damages, losses, or expenses (including legal fees) arising from the Merchant's products, services, listings, negligence, or violation of these Terms or applicable law.</p>

          <h2>8. Suspension & Termination</h2>
          <p>BahiBox reserves the right to suspend or terminate a Merchant's account, without prior notice, in case of consumer complaints, quality issues, fraud, non-compliance with regulatory requirements, or any activity harmful to the Platform, customers, or BahiBox's reputation.</p>

          <h2>9. Intellectual Property</h2>
          <p>The Merchant retains ownership of their brand, logo, and content but grants BahiBox a non-exclusive, royalty-free license to display such content on the Platform for the purpose of listing and promoting the Merchant's products/services.</p>

          <h2>10. Grievance Officer</h2>
          <p>In accordance with the Information Technology Act, 2000 and rules made thereunder, the details of the Grievance Officer are:</p>
          <p>Name: Upendra K Chaudhary<br />Email: ukcbrh@gmail.com</p>

          <h2>11. Governing Law & Jurisdiction</h2>
          <p>This Agreement shall be governed by the laws of India. Any dispute arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the courts at Bahraich, Uttar Pradesh.</p>

          <h2>12. Force Majeure</h2>
          <p>BahiBox shall not be liable for any failure or delay in performance due to causes beyond its reasonable control, including natural disasters, internet outages, government action, or third-party service failures.</p>

          <h2>13. Changes to Terms</h2>
          <p>BahiBox may update these Terms from time to time. Continued use of the Platform after changes constitutes acceptance of the revised Terms.</p>
        </>
      ) : (
        <>
          <p>यह मर्चेंट समझौता BahiBox प्लेटफॉर्म ("प्लेटफॉर्म") के आपके उपयोग को एक मर्चेंट, रेस्टोरेंट, होटल, या सेवा प्रदाता ("मर्चेंट") के रूप में नियंत्रित करता है। पंजीकरण करके, आप इन शर्तों से बंधे होने के लिए सहमत होते हैं।</p>

          <h2>1. संबंध की प्रकृति</h2>
          <p>BahiBox एक तकनीकी प्लेटफॉर्म है जो मर्चेंट को ग्राहकों से जोड़ता है। BahiBox एक स्वतंत्र मध्यस्थ है और मर्चेंट और ग्राहक के बीच किसी भी बिक्री, लेनदेन, या समझौते का पक्षकार नहीं है। इस समझौते में कुछ भी BahiBox और मर्चेंट के बीच रोजगार, साझेदारी, एजेंसी, या संयुक्त-उद्यम संबंध नहीं बनाता।</p>

          <h2>2. मर्चेंट की जिम्मेदारियां</h2>
          <p>मर्चेंट, स्वास्थ्य सेवा प्रदाता, सेवा प्रदाता, राइडर, या तृतीय-पक्ष लिस्टर ("प्रोवाइडर") पूरी तरह से जिम्मेदार है: (क) रिटेल, फूड एवं हॉस्पिटैलिटी, हेल्थकेयर, लॉजिस्टिक्स, क्लासिफाइड्स और एग्री-टेक सहित सभी श्रेणियों में प्रोडक्ट/मेन्यू/कमरे/लिस्टिंग विवरण, कीमत और स्टॉक की सटीकता; (ख) प्रस्तुत सभी प्रोडक्ट, भोजन, स्वास्थ्य सेवाओं, राइड्स और लिस्टिंग की गुणवत्ता, सुरक्षा, चिकित्सा सटीकता, राइड सुरक्षा, ताजगी, प्रामाणिकता और वैधता; (ग) व्यवसाय संचालन के लिए आवश्यक सभी लाइसेंस, FSSAI पंजीकरण, चिकित्सा/व्यावसायिक पंजीकरण, GST पंजीकरण, ड्राइविंग/वाहन परमिट प्राप्त करना और बनाए रखना; (घ) ऑर्डर, बुकिंग और सेवाओं की समय पर पूर्ति; और (ङ) सभी लागू कानूनों का अनुपालन।</p>

          <h2>3. कमीशन और शुल्क</h2>
          <p>BahiBox ऑनबोर्डिंग के समय मर्चेंट को बताए गए अनुसार या समय-समय पर अपडेट किए गए अनुसार कमीशन/सदस्यता शुल्क लेगा। BahiBox मर्चेंट को उचित पूर्व सूचना के साथ कमीशन संरचना या प्लेटफॉर्म शुल्क में संशोधन का अधिकार सुरक्षित रखता है।</p>

          <h2>4. भुगतान और निपटान</h2>
          <p>ग्राहकों से एकत्र किया गया भुगतान तृतीय-पक्ष भुगतान गेटवे (Razorpay सहित) के माध्यम से संसाधित होता है और प्लेटफॉर्म के निपटान चक्र के अनुसार मर्चेंट के पंजीकृत बैंक खाते या वॉलेट में जमा किया जाता है। भुगतान गेटवे, बैंकिंग पार्टनर, या मर्चेंट द्वारा दी गई गलत बैंक जानकारी के कारण होने वाली देरी के लिए BahiBox जिम्मेदार नहीं है।</p>

          <h2>5. डेटा हानि अस्वीकरण</h2>
          <p>BahiBox मर्चेंट डेटा (बिक्री रिकॉर्ड, इन्वेंटरी, और ग्राहक जानकारी सहित) की सुरक्षा के लिए उचित तकनीकी उपाय करता है, लेकिन तकनीकी विफलता, सर्वर डाउनटाइम, साइबर हमले, तृतीय-पक्ष उल्लंघन, या BahiBox के उचित नियंत्रण से बाहर की घटनाओं के कारण डेटा की किसी भी हानि के लिए BahiBox जिम्मेदार नहीं होगा। मर्चेंट को अपने व्यावसायिक रिकॉर्ड और बैकअप स्वतंत्र रूप से बनाए रखने की सलाह दी जाती है।</p>

          <h2>6. दायित्व की सीमा</h2>
          <p>कानून द्वारा अनुमत अधिकतम सीमा तक, इस समझौते से उत्पन्न होने वाली मर्चेंट के प्रति BahiBox की कुल जिम्मेदारी, पिछले तीन (3) महीनों में मर्चेंट द्वारा BahiBox को भुगतान किए गए कुल कमीशन/शुल्क से अधिक नहीं होगी। BahiBox किसी भी अप्रत्यक्ष, आकस्मिक, विशेष, या परिणामी क्षति के लिए उत्तरदायी नहीं होगा।</p>

          <h2>7. क्षतिपूर्ति</h2>
          <p>मर्चेंट, BahiBox, इसके मालिकों, कर्मचारियों और सहयोगियों को मर्चेंट के प्रोडक्ट, सेवाओं, लिस्टिंग, लापरवाही, या इन शर्तों या लागू कानून के उल्लंघन से उत्पन्न किसी भी दावे, क्षति, हानि, या व्यय (कानूनी शुल्क सहित) से हानिरहित रखने के लिए सहमत है।</p>

          <h2>8. निलंबन और समाप्ति</h2>
          <p>BahiBox ग्राहक शिकायतों, गुणवत्ता समस्याओं, धोखाधड़ी, नियामक आवश्यकताओं के गैर-अनुपालन, या प्लेटफॉर्म को हानि पहुंचाने वाली किसी भी गतिविधि की स्थिति में, बिना पूर्व सूचना के, मर्चेंट के खाते को निलंबित या समाप्त करने का अधिकार सुरक्षित रखता है।</p>

          <h2>9. बौद्धिक संपदा</h2>
          <p>मर्चेंट अपने ब्रांड, लोगो और सामग्री का स्वामित्व बनाए रखता है, लेकिन BahiBox को अपने प्रोडक्ट/सेवाओं की लिस्टिंग और प्रचार के उद्देश्य से ऐसी सामग्री प्रदर्शित करने के लिए एक गैर-अनन्य, रॉयल्टी-मुक्त लाइसेंस प्रदान करता है।</p>

          <h2>10. शिकायत अधिकारी</h2>
          <p>सूचना प्रौद्योगिकी अधिनियम, 2000 और उसके तहत बनाए गए नियमों के अनुसार, शिकायत अधिकारी का विवरण इस प्रकार है:</p>
          <p>नाम: उपेंद्र के चौधरी<br />ईमेल: ukcbrh@gmail.com</p>

          <h2>11. शासी कानून और अधिकार क्षेत्र</h2>
          <p>यह समझौता भारत के कानूनों द्वारा शासित होगा। इस समझौते से उत्पन्न होने वाला कोई भी विवाद बहराइच, उत्तर प्रदेश की अदालतों के विशेष अधिकार क्षेत्र के अधीन होगा।</p>

          <h2>12. अप्रत्याशित घटना</h2>
          <p>प्राकृतिक आपदाओं, इंटरनेट आउटेज, सरकारी कार्रवाई, या तृतीय-पक्ष सेवा विफलताओं सहित BahiBox के उचित नियंत्रण से बाहर के कारणों से प्रदर्शन में किसी भी विफलता या देरी के लिए BahiBox उत्तरदायी नहीं होगा।</p>

          <h2>13. शर्तों में परिवर्तन</h2>
          <p>BahiBox समय-समय पर इन शर्तों को अपडेट कर सकता है। परिवर्तनों के बाद प्लेटफॉर्म का निरंतर उपयोग संशोधित शर्तों की स्वीकृति माना जाएगा।</p>
        </>
      )}
    </PolicyLayout>
  );
}
