import { useState, useEffect } from "react";
import { I18n } from "aws-amplify/utils";
import { useNavigate } from "react-router-dom";
import {
  TopNavigation,
  Header,
  ButtonDropdown,
  Container,
  Button,
} from "@cloudscape-design/components";
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
import { translations } from "@aws-amplify/ui-react";
import "./AuthForm.css";

function AuthForm(props) {
  // multi language
  let { t } = props;
  const navigate = useNavigate();
  const [language, setLanguage] = useState(props.i18n.language);
  I18n.putVocabularies(translations);
  I18n.setLanguage(props.i18n.language);

  useEffect(() => {
    t = props.t;
  }, [props.i18n.language]);

  I18n.putVocabularies({
    mi: {
      "Sign In": "ဆိုင်းအင်လုပ်ခြင်း",
      "Sign in": "ဆိုင်းအင်လုပ်ခြင်း",
      "Create Account": "အကောင့်ပြုလုပ်ပါ",
      "Forgot your password?": "သင့်စကားဝှက်ကိုမေ့နေပါသလား?",
      "Signing in": "ဆိုင်းအင်လုပ်ခြင်း ...",
      "Creating Account": "အကောင့်ပြုလုပ်ပါ ...",
      Email: "အီးမေးလ်",
      "Enter your Email": "သင့်အီးမေးလ်ကို ထည့်ပါ။",
      Password: "စကားဝှက်",
      "Enter your Password": "သင်၏စကားဝှက်ကိုထည့်ပါ။",
      Username: "အသုံးပြုသူအမည်",
      "Enter your Username": "သင့်အသုံးပြုသူအမည်ကို ထည့်ပါ။12345",
      Name: "နာမည်",
      "Enter your Name": "သင်၏နာမည်ကို ထည့်ပါ။",
      "Phone number": "ဖုန်းနံပါတ်",
      "Enter your phone number": "သင်၏ဖုန်းနံပါတ်ကို ထည့်ပါ။",
      "Please confirm your Password": "သင့်စကားဝှက်ကို အတည်ပြုပါ။",
      "Confirm Password": "စကားဝှက်ကို အတည်ပြုပါ။",
      "Enter your password again": "သင်၏စကားဝှက်ကို ထပ်မံထည့်ပါ။",
      Role: "အခန်းကဏ္ဍ",
      Volunteer: "စေတနာ့ဝန်ထမ်း",
      Confirm: "အတည်ပြုပါ။",
      "Confirm Code": "အတည်ပြုကုဒ်",
      "Enter your code": "သင်၏ကုဒ်ကို ထည့်ပါ။",
      "Resend Code": "ကုဒ်ကို ပြန်ပို့ပါ။",
      "Enter your code": "သင်၏ကုဒ်ကို ထည့်ပါ။",
      "We Emailed You": "ကျွန်ုပ်တို့သည် သင်ထံ အီးမေးလ်ပို့ခဲ့သည်။",
      "Your code is on the way. To log in, enter the code we emailed to":
        "သင်၏ကုဒ်သည် လမ်းပေါ်တွင်ဖြစ်နေသည်။ ဝင်ရောက်ရန်၊ ကျွန်ုပ်တို့သည် သင်ထံ အီးမေးလ်ပို့ခဲ့သော ကုဒ်ကို ထည့်ပါ။",
      "It may take a minute to arrive": "ရောက်ရှိရန် တစ်မိနစ်ခန့် ကြာနိုင်သည်။",
      "Use a at least 8 character password with a mix of uppercase, lowercase and numbers.":
        "စကားဝှက်ကို အနည်းဆုံး စားပြီး ရှိသည့် အချက်အလက်များကို အသစ်ထည့်ပါ။",
      "is required to signIn": "ဆိုင်းအင်လုပ်ရန် လိုအပ်သည်။",
      "is required to signUp": "ဆိုင်းအင်လုပ်ရန် လိုအပ်သည်။"
    },
  });

  const formFields = {
    signIn: {
      username: {
        label: "Email",
        placeholder: "Enter your Email",
        isRequired: false,
        order: 1,
      },
      password: {
        label: "Password",
        placeholder: "Enter your Password",
        isRequired: false,
        order: 2,
      },
    },
    signUp: {
      name: {
        label: "Name",
        placeholder: "Enter your Name",
        isRequired: true,
        order: 1,
      },
      email: {
        label: "Email",
        placeholder: "Enter your Email",
        isRequired: true,
        order: 2,
      },
      phone_number: {
        label: "Phone number",
        placeholder: "Enter your phone number",
        isRequired: true,
        order: 3,
      },
      password: {
        label: "Password",
        placeholder: "Enter your Password",
        isRequired: true,
        order: 4,
      },
      confirm_password: {
        label: "Confirm Password",
        placeholder: "Enter your password again",
        isRequired: true,
        order: 5,
      },
    },
    forgotPassword: {
      username: {
        placeholder: "Enter your Email",
      },
    },
    confirmSignUp: {
      confirmation_code: {
        label: "Confirm Code",
        placeholder: "Enter your code",
        isRequired: false,
      },
    },
  };

  return (
    <Container
      header={
        <Header
          variant="h4"
          actions={
            <ButtonDropdown
              onItemClick={(e) => {
                const newLang = e.detail.id;
                console.log(e.detail);
                props.i18n.changeLanguage(newLang);
                setLanguage(newLang);
                I18n.setLanguage(newLang);
              }}
              items={[
                { text: "English", id: "en", disabled: language === "en" },
                { text: "Burmese", id: "mi", disabled: language === "mi" },
              ]}
            >
              {language === "en" ? "English" : "Burmese"}
            </ButtonDropdown>
          }
        >
          <a onClick={() => navigate("/")} style={{cursor: "pointer"}}>{t("common.back-to-home")}</a>
        </Header>
      }
    >
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
                    <option value="Volunteer">
                      {t("auth.role.volunteer")}
                    </option>
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
    </Container>
  );
}

export default withTranslation()(AuthForm);
