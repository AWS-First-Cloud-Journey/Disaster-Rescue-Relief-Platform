import { useState } from "react";
import { I18n } from 'aws-amplify/utils';
import {
  Authenticator,
  Theme,
  ThemeProvider,
  useTheme,
  SelectField,
} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { Navigate } from "react-router-dom";
import { withTranslation } from "react-i18next";
import { translations } from '@aws-amplify/ui-react';
import "./AuthForm.css";

// const formFields = {
//   signUp: {
//     name: {
//       label: "Username",
//       placeholder: "Enter your Username",
//       order: 5
//     },
//     "custom:role": {
//       label: "Role",
//       option: ['Volunteer'],
//       order: 10
//     },
//   },
// };

function AuthForm(props) {
  // multi language
  const { t } = props;

  I18n.putVocabularies(translations);
  I18n.setLanguage(props.i18n.language);
  // I18n.setLanguage("mi");

  I18n.putVocabularies({
    mi: {
      'Sign In': 'ဆိုင်းအင်လုပ်ခြင်း',
      'Sign in': 'ဆိုင်းအင်လုပ်ခြင်း',
      'Create Account': "အကောင့်ပြုလုပ်ပါ",
      'Forgot your password?': 'သင့်စကားဝှက်ကိုမေ့နေပါသလား?',
      'Signing in': "ဆိုင်းအင်လုပ်ခြင်း ...",
      'Creating Account': "အကောင့်ပြုလုပ်ပါ ...",
      'Email': "အီးမေးလ်",
      "Enter your Email": "သင့်အီးမေးလ်ကို ထည့်ပါ။",
      'Password': 'စကားဝှက်',
      'Enter your Password': 'သင်၏စကားဝှက်ကိုထည့်ပါ။',
      'Username': 'အသုံးပြုသူအမည်',
      'Phone number': 'ဖုန်းနံပါတ်',
      'Enter your Username': 'သင့်အသုံးပြုသူအမည်ကို ထည့်သွင်းပါ။',
      'Enter your phone number': 'သင်၏ဖုန်းနံပါတ်ကို ထည့်ပါ။',
      'Please confirm your Password': 'သင့်စကားဝှက်ကို အတည်ပြုပါ။',
      'Role': 'အခန်းကဏ္ဍ',
      'Volunteer': 'စေတနာ့ဝန်ထမ်း',
      'Confirm': 'အတည်ပြုပါ။',
      "Resend Code": "ကုဒ်ကို ပြန်ပို့ပါ။",
      "Enter your code": "သင်၏ကုဒ်ကို ထည့်ပါ။",
      "We Emailed You": "ကျွန်ုပ်တို့သည် သင်ထံ အီးမေးလ်ပို့ခဲ့သည်။",
      "Your code is on the way. To log in, enter the code we emailed to": "သင်၏ကုဒ်သည် လမ်းပေါ်တွင်ဖြစ်နေသည်။ ဝင်ရောက်ရန်၊ ကျွန်ုပ်တို့သည် သင်ထံ အီးမေးလ်ပို့ခဲ့သော ကုဒ်ကို ထည့်ပါ။",
      "It may take a minute to arrive": "ရောက်ရှိရန် တစ်မိနစ်ခန့် ကြာနိုင်သည်။",
      'Use a at least 8 character password with a mix of uppercase, lowercase and numbers.': 'စကားဝှက်ကို အနည်းဆုံး စားပြီး ရှိသည့် အချက်အလက်များကို အသစ်ထည့်ပါ။',
    },
  });

  const formFields = {
    signIn: {
      username: {
        label: t("auth.email.label"),
        placeholder: t("auth.email.placeholder"),
        isRequired: false,
        order: 1
      },
      password: {
        label: t("auth.password.label"),
        placeholder: t("auth.password.placeholder"),
        isRequired: false,
        order: 2,
      },
    },
    signUp: {
      name: {
        label: t("auth.name.label"),
        placeholder: t("auth.name.placeholder"),
        isRequired: true,
        order: 1
      },
      email: {
        label: t("auth.email.label"),
        placeholder: t("auth.email.placeholder"),
        isRequired: true,
        order: 2
      },
      phone_number: {
        label: t("auth.phone_number.label"),
        placeholder: t("auth.phone_number.placeholder"),
        isRequired: true,
        order: 3,
      },
      password: {
        label: t("auth.password.label"),
        placeholder: t("auth.password.placeholder"),
        isRequired: true,
        order: 4,
      },
      confirm_password: {
        label: t("auth.confirm_pass.label"),
        placeholder: t("auth.confirm_pass.placeholder"),
        isRequired: true,
        order: 5,
      },
    },
    forgotPassword: {
      username: {
        placeholder: t("auth.email.placeholder"),
      },
    },
    confirmSignUp: {
      confirmation_code: {
        label: t("auth.confirm_code.label"),
        placeholder: t("auth.confirm_code.placeholder"),
        isRequired: false,
      },
    },
  };

  return (
    <Authenticator
      // Customize `Authenticator.SignUp.FormFields`
      formFields={formFields}
      components={{
        SignUp: {
          FormFields() {
            return (
              <>
                {/* Re-use default `Authenticator.SignUp.FormFields` */}
                <Authenticator.SignUp.FormFields />

                {/* Append & require Terms & Conditions field to sign up  */}
                <SelectField label={t("auth.role.label")} name="custom:role">
                  <option value={'Volunteer'}>{t("auth.role.volunteer")}</option>
                  {/* <option value="saler">Saler</option> */}
                </SelectField>
              </>
            );
          },
        },
      }}
    >
      <Navigate to="/" />
    </Authenticator>
  );
}

export default withTranslation()(AuthForm)
