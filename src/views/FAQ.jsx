import React from 'react';
import { withTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import {
  Container,
  Header,
  SpaceBetween,
  ExpandableSection,
} from '@cloudscape-design/components';

function FAQ(props) {
  const { t } = props;

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

  return (
    <>
      <Outlet />
      <Container>
        <SpaceBetween size="l">
          <Header variant="h1">{t('faq-page.title')}</Header>
          <SpaceBetween size="l">
            {faqs.map((faq, index) => (
              <ExpandableSection
                key={index}
                headerText={faq.question}
                defaultExpanded={index === 0}
              >
                {faq.answer}
              </ExpandableSection>
            ))}
          </SpaceBetween>
        </SpaceBetween>
      </Container>
    </>
  );
}

export default withTranslation()(FAQ);