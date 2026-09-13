import React from 'react';
import { PolicyLayout } from '../components/legal/PolicyLayout';

export default function CustomerPolicy() {
  return (
    <PolicyLayout
      titleEn="Customer Terms & Conditions"
      titleHi="ग्राहक नियम एवं शर्तें"
      lastUpdated="August 2026"
    >
      {(lang) => lang === 'en' ? (
        <>
          <p>Welcome to BahiBox. By creating an account, placing an order, booking a service, or using our wallet on the BahiBox platform ("Platform"), you agree to be bound by these Terms & Conditions.</p>

          <h2>1. About BahiBox</h2>
          <p>BahiBox is an online marketplace that connects independent merchants, restaurants, hotels, and service providers ("Merchants") with customers. BahiBox acts solely as an intermediary/technology platform. BahiBox does not manufacture, prepare, cook, own, or directly sell any product, food item, room, or service listed on the Platform — all such items are listed, priced, and fulfilled solely by the respective Merchant.</p>

          <h2>2. Orders, Products & Services</h2>
          <p>BahiBox is a multi-category platform covering Retail products, Food & Hospitality, Healthcare bookings, Logistics/rides, Classifieds, Agri-Tech, and other listed services. All descriptions, prices, quality, safety, medical advice, ride safety, listing authenticity, and service standards across every category are the sole responsibility of the Merchant, healthcare provider, service provider, rider, or third-party lister ("Provider") offering that item. BahiBox does not guarantee the accuracy, quality, safety, or legality of any listing or service in any category. Any dispute regarding quality, quantity, authenticity, medical outcome, ride experience, or fitness of a product/service must be raised with the concerned Provider directly, though BahiBox will make reasonable efforts to assist in resolution.</p>

          <h2>3. BahiBox Coin (Wallet)</h2>
          <p>BahiBox Coin is an in-app prepaid balance that can be used to pay for orders and bookings on the Platform. BahiBox Coin has no cash withdrawal value and cannot be transferred to a bank account, UPI, or any third party. It can only be used for purchases within the Platform.</p>

          <h2>4. Payments</h2>
          <p>Payments are processed through third-party payment gateways (including Razorpay). BahiBox does not store your card or bank credentials. BahiBox is not liable for delays, failures, or errors caused by the payment gateway, your bank, or your network provider.</p>

          <h2>5. Data Loss Disclaimer</h2>
          <p>While BahiBox takes reasonable technical measures to protect user data, BahiBox shall not be held responsible or liable for any loss, corruption, unauthorized access, or deletion of data arising from technical failure, server downtime, cyberattack, third-party breach, or events beyond BahiBox's reasonable control. Users are advised to keep their own records of important transactions.</p>

          <h2>6. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, BahiBox's total liability arising out of or relating to your use of the Platform shall not exceed the amount paid by you for the specific order/booking giving rise to the claim. BahiBox shall not be liable for any indirect, incidental, special, or consequential damages of any kind.</p>

          <h2>7. Indemnification</h2>
          <p>You agree to indemnify and hold harmless BahiBox, its owners, employees, and affiliates from any claims, damages, losses, or expenses arising from your misuse of the Platform, violation of these Terms, or violation of any law or third-party right.</p>

          <h2>8. Service "As-Is"</h2>
          <p>The Platform is provided on an "as-is" and "as-available" basis without warranties of any kind, whether express or implied, including uninterrupted availability, error-free operation, or fitness for a particular purpose.</p>

          <h2>9. Account Termination</h2>
          <p>BahiBox reserves the right to suspend or terminate any user account, without prior notice, in case of suspected fraud, abuse, policy violation, or any activity harmful to the Platform, other users, or Merchants.</p>

          <h2>10. Grievance Officer</h2>
          <p>In accordance with the Information Technology Act, 2000 and rules made thereunder, the details of the Grievance Officer are:</p>
          <p>Name: Upendra K Chaudhary<br />Email: ukcbrh@gmail.com</p>

          <h2>11. Governing Law & Jurisdiction</h2>
          <p>These Terms shall be governed by the laws of India. Any dispute arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts at Bahraich, Uttar Pradesh.</p>

          <h2>12. Force Majeure</h2>
          <p>BahiBox shall not be liable for any failure or delay in performance due to causes beyond its reasonable control, including natural disasters, internet outages, government action, or third-party service failures.</p>

          <h2>13. Changes to Terms</h2>
          <p>BahiBox may update these Terms from time to time. Continued use of the Platform after changes constitutes acceptance of the revised Terms.</p>
        </>
      ) : (
        <>
          <p>BahiBox में आपका स्वागत है। खाता बनाकर, ऑर्डर देकर, बुकिंग करके, या हमारे वॉलेट का उपयोग करके, आप इन नियमों एवं शर्तों से बंधे होने के लिए सहमत होते हैं।</p>

          <h2>1. BahiBox के बारे में</h2>
          <p>BahiBox एक ऑनलाइन मार्केटप्लेस है जो स्वतंत्र मर्चेंट, रेस्टोरेंट, होटल और सेवा प्रदाताओं ("मर्चेंट") को ग्राहकों से जोड़ता है। BahiBox केवल एक मध्यस्थ/तकनीकी प्लेटफॉर्म के रूप में कार्य करता है। BahiBox किसी भी प्रोडक्ट, खाद्य पदार्थ, कमरे या सेवा का निर्माण, तैयारी, स्वामित्व या सीधी बिक्री नहीं करता — यह सब संबंधित मर्चेंट की जिम्मेदारी है।</p>

          <h2>2. ऑर्डर, प्रोडक्ट और सेवाएं</h2>
          <p>BahiBox एक मल्टी-कैटेगरी प्लेटफॉर्म है जिसमें रिटेल प्रोडक्ट, फूड एवं हॉस्पिटैलिटी, हेल्थकेयर बुकिंग, लॉजिस्टिक्स/राइड्स, क्लासिफाइड्स, एग्री-टेक और अन्य सूचीबद्ध सेवाएं शामिल हैं। सभी श्रेणियों में विवरण, कीमत, गुणवत्ता, सुरक्षा, चिकित्सा सलाह, राइड सुरक्षा, लिस्टिंग की प्रामाणिकता और सेवा मानक संबंधित मर्चेंट, स्वास्थ्य सेवा प्रदाता, सेवा प्रदाता, राइडर, या तृतीय-पक्ष लिस्टर ("प्रोवाइडर") की पूरी जिम्मेदारी है। गुणवत्ता, मात्रा, प्रामाणिकता, चिकित्सा परिणाम, या राइड अनुभव से संबंधित कोई भी विवाद सीधे संबंधित प्रोवाइडर के साथ उठाया जाना चाहिए, हालांकि BahiBox समाधान में सहायता के उचित प्रयास करेगा।</p>

          <h2>3. BahiBox कॉइन (वॉलेट)</h2>
          <p>BahiBox कॉइन एक इन-ऐप प्रीपेड बैलेंस है जिसका उपयोग प्लेटफॉर्म पर भुगतान के लिए किया जा सकता है। BahiBox कॉइन का कोई नकद निकासी मूल्य मूल्य नहीं है और इसे बैंक खाते, UPI, या किसी तीसरे पक्ष को ट्रांसफर नहीं किया जा सकता।</p>

          <h2>4. भुगतान</h2>
          <p>भुगतान तृतीय-पक्ष भुगतान गेटवे (Razorpay सहित) के माध्यम से संसाधित होते हैं। BahiBox आपके कार्ड या बैंक क्रेडेंशियल्स को संग्रहीत नहीं करता। भुगतान गेटवे, आपके बैंक, या नेटवर्क प्रदाता के कारण होने वाली देरी या त्रुटियों के लिए BahiBox जिम्मेदार नहीं है।</p>

          <h2>5. डेटा हानि अस्वीकरण</h2>
          <p>BahiBox उपयोगकर्ता डेटा की सुरक्षा के लिए उचित तकनीकी उपाय करता है, लेकिन तकनीकी विफलता, सर्वर डाउनटाइम, साइबर हमले, तृतीय-पक्ष उल्लंघन, या BahiBox के उचित नियंत्रण से बाहर की घटनाओं के कारण डेटा की किसी भी हानि, भ्रष्टाचार, अनधिकृत पहुंच, या विलोपन के लिए BahiBox जिम्मेदार नहीं होगा। उपयोगकर्ताओं को महत्वपूर्ण लेनदेन का अपना रिकॉर्ड रखने की सलाह दी जाती है।</p>

          <h2>6. दायित्व की सीमा</h2>
          <p>कानून द्वारा अनुमत अधिकतम सीमा तक, प्लेटफॉर्म के उपयोग से उत्पन्न होने वाली BahiBox की कुल जिम्मेदारी उस विशिष्ट ऑर्डर/बुकिंग के लिए आपके द्वारा भुगतान की गई राशि से अधिक नहीं होगी। BahiBox किसी भी अप्रत्यक्ष, आकस्मिक, विशेष, या परिणामी क्षति के लिए उत्तरदायी नहीं होगा।</p>

          <h2>7. क्षतिपूर्ति</h2>
          <p>आप BahiBox, इसके मालिकों, कर्मचारियों और सहयोगियों को आपके द्वारा प्लेटफॉर्म के दुरुपयोग, इन शर्तों के उल्लंघन, या किसी कानून या तृतीय-पक्ष अधिकार के उल्लंघन से उत्पन्न किसी भी दावे, क्षति, हानि, या व्यय से हानिरहित रखने के लिए सहमत हैं।</p>

          <h2>8. सेवा "जैसी है"</h2>
          <p>प्लेटफॉर्म को "जैसा है" और "जैसा उपलब्ध है" के आधार पर बिना किसी वारंटी के प्रदान किया जाता है, जिसमें निर्बाध उपलब्धता या त्रुटि-मुक्त संचालन शामिल नहीं है।</p>

          <h2>9. खाता समाप्ति</h2>
          <p>BahiBox धोखाधड़ी, दुरुपयोग, नीति उल्लंघन, या प्लेटफॉर्म को हानि पहुंचाने वाली किसी भी गतिविधि की स्थिति में, बिना पूर्व सूचना के, किसी भी उपयोगकर्ता खाते को निलंबित या समाप्त करने का अधिकार सुरक्षित रखता है।</p>

          <h2>10. शिकायत अधिकारी</h2>
          <p>सूचना प्रौद्योगिकी अधिनियम, 2000 और उसके तहत बनाए गए नियमों के अनुसार, शिकायत अधिकारी का विवरण इस प्रकार है:</p>
          <p>नाम: उपेंद्र के चौधरी<br />ईमेल: ukcbrh@gmail.com</p>

          <h2>11. शासी कानून और अधिकार क्षेत्र</h2>
          <p>ये नियम भारत के कानूनों द्वारा शासित होंगे। इन नियमों से उत्पन्न होने वाला कोई भी विवाद बहराइच, उत्तर प्रदेश की अदालतों के विशेष अधिकार क्षेत्र के अधीन होगा।</p>

          <h2>12. अप्रत्याशित घटना</h2>
          <p>प्राकृतिक आपदाओं, इंटरनेट आउटेज, सरकारी कार्रवाई, या तृतीय-पक्ष सेवा विफलताओं सहित BahiBox के उचित नियंत्रण से बाहर के कारणों से प्रदर्शन में किसी भी विफलता या देरी के लिए BahiBox उत्तरदायी नहीं होगा।</p>

          <h2>13. शर्तों में परिवर्तन</h2>
          <p>BahiBox समय-समय पर इन शर्तों को अपडेट कर सकता है। परिवर्तनों के बाद प्लेटफॉर्म का निरंतर उपयोग संशोधित शर्तों की स्वीकृति माना जाएगा।</p>
        </>
      )}
    </PolicyLayout>
  );
}
