import React, { useState } from 'react';
import { withTranslation } from 'react-i18next';
import { Outlet, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp, Mail, HelpCircle } from 'lucide-react';
import './FAQ.css';

function FAQ({ t }) {
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const faqs = [
    { question: t('faq-page.q1'), answer: t('faq-page.a1') },
    { question: t('faq-page.q2'), answer: t('faq-page.a2') },
    { question: t('faq-page.q3'), answer: t('faq-page.a3') },
    { question: t('faq-page.q4'), answer: t('faq-page.a4') },
    { question: t('faq-page.q5'), answer: t('faq-page.a5') }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFAQ = (index) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
  };

  return (
    <div className="faq-container">
      <Outlet />
      <div className="faq-hero">
        <h1>{t('faq-page.title')}</h1>
        <p>{t('faq-page.subtitle')}</p>
      </div>

      <div className="search-container">
        <div className="search-input">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder={t('faq-page.search-placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="faq-content">
        <div className="faq-sidebar">
          <div className="sidebar-header">
            <HelpCircle size={24} className="sidebar-icon" />
            <h3>{t('faq-page.quick-links')}</h3>
          </div>
          <ul className="sidebar-nav">
            {filteredFaqs.map((faq, index) => (
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
            <div className="contact-header">
              <Mail size={24} className="contact-icon" />
              <h4>{t('faq-page.need-help')}</h4>
            </div>
            <p>{t('faq-page.contact-text')}</p>
            <a href="mailto:contact@myanmardisasterrelief.com" className="contact-button">
              {t('faq-page.contact-btn')}
            </a>
          </div>
        </div>

        <div className="faq-accordion">
          {filteredFaqs.map((faq, index) => (
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
                  {expandedIndex === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
        <h2>{t('faq-page.cta-title')}</h2>
        <p>{t('faq-page.cta-text')}</p>
        <div className="cta-buttons">
          <button className="cta-button primary" onClick={() => navigate("/request")}> 
            {t('home.req.btn-txt')}
          </button>
          <button className="cta-button secondary" onClick={() => navigate("/requestList")}> 
            {t('home.view.btn-txt')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default withTranslation()(FAQ);