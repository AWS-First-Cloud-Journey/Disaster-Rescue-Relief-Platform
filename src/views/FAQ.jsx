import React, { useState } from 'react';
import { withTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import './FAQ.css';

function FAQ(props) {
  const { t } = props;
  const [expandedIndex, setExpandedIndex] = useState(0);

  const faqs = [
    {
      question: t('faq-page.q1'),
      answer: t('faq-page.a1')
    },
    {
      question: t('faq-page.q2'),
      answer: t('faq-page.a2')
    },
    {
      question: t('faq-page.q3'),
      answer: t('faq-page.a3')
    },
    {
      question: t('faq-page.q4'),
      answer: t('faq-page.a4')
    },
    {
      question: t('faq-page.q5'),
      answer: t('faq-page.a5')
    }
  ];

  const toggleFAQ = (index) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
  };

  return (
    <div className="faq-container">
      <Outlet />
      <div className="faq-hero">
        <h1>{t('faq-page.title')}</h1>
        <p>{t('faq-page.subtitle', 'Common questions about earthquake aid coordination')}</p>
      </div>

      <div className="faq-content">
        <div className="faq-sidebar">
          <div className="sidebar-header">
            <h3>{t('faq-page.quick-links', 'Quick Links')}</h3>
          </div>
          <ul className="sidebar-nav">
            {faqs.map((faq, index) => (
              <li 
                key={`nav-${index}`}
                className={expandedIndex === index ? 'active' : ''}
                onClick={() => toggleFAQ(index)}
              >
                {faq.question}
              </li>
            ))}
          </ul>
          <div className="sidebar-contact">
            <h4>{t('faq-page.need-help', 'Need More Help?')}</h4>
            <p>{t('faq-page.contact-text', 'If you can\'t find an answer to your question, please contact our support team.')}</p>
            <button className="contact-button">
              {t('faq-page.contact-btn', 'Contact Support')}
            </button>
          </div>
        </div>

        <div className="faq-accordion">
          {faqs.map((faq, index) => (
            <div 
              key={`faq-${index}`}
              className={`faq-item ${expandedIndex === index ? 'expanded' : ''}`}
            >
              <div 
                className="faq-question"
                onClick={() => toggleFAQ(index)}
              >
                <h3>{faq.question}</h3>
                <div className="faq-icon">
                  {expandedIndex === index ? '−' : '+'}
                </div>
              </div>
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="faq-cta">
        <h2>{t('faq-page.cta-title', 'Ready to Help?')}</h2>
        <p>{t('faq-page.cta-text', 'Join our volunteer network or request assistance for those affected by the earthquake.')}</p>
        <div className="cta-buttons">
          <button className="cta-button primary">
            {t('home.req.btn-txt', 'Request Help')}
          </button>
          <button className="cta-button secondary">
            {t('home.vol.btn-txt', 'Volunteer')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default withTranslation()(FAQ);