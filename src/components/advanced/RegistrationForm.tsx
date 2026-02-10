import React from 'react';
import { Survey } from 'survey-react-ui';
import { Model } from 'survey-core';
import { RegistrationFormProps } from '../../types';

const RegistrationForm: React.FC<RegistrationFormProps> = ({ 
  title = "Registration ",
  puck 
}) => {
  const surveyJson = {
    title: title,
    showProgressBar: "top",
    showQuestionNumbers: "off",
    pages: [
      {
        name: "registration",
        elements: [
          { type: "text", name: "fullName", title: "Full name", isRequired: true, placeholder: "Enter full name" },
          { type: "text", name: "email", title: "Email", inputType: "email", placeholder: "Pre-filled from profile creation" },
          { type: "text", name: "phone", title: "Phone", inputType: "tel", placeholder: "Enter phone" },
          { type: "dropdown", name: "ticketType", title: "Ticket type", placeholder: "Select ticket type", choices: ["General Admission","VIP","Student","Early Bird","Group"] },
          { type: "dropdown", name: "category", title: "Category", placeholder: "Select category", choices: ["Technology","Business","Education","Healthcare","Other"] },
          { type: "dropdown", name: "organization", title: "Organization", placeholder: "Select organization", choices: ["Company A","Company B","University","Non-profit","Other"] },
          { type: "text", name: "address", title: "Address", placeholder: "Enter address" },
          { type: "dropdown", name: "dietaryRequirements", title: "Dietary requirements", placeholder: "Select dietary requirements", choices: ["None","Vegetarian","Vegan","Gluten-free","Halal","Kosher","Other"] },
          { type: "dropdown", name: "accessibilityRequirements", title: "Accessibility requirements", placeholder: "Select accessibility requirements", choices: ["None","Wheelchair access","Hearing assistance","Visual assistance","Other"] },
          { type: "boolean", name: "termsAccepted", title: "Terms & Conditions", isRequired: true }
        ]
      }
    ],
    completeText: "Pay & Register",
    showCompletedPage: false
  };

  const survey = new Model(surveyJson);

  survey.onComplete.add((sender) => {
    console.log("Form completed with data:", sender.data);
  });

  return (
    <>
      {/* Global SurveyJS violet theme override */}
      <style>
        {`
          /* SurveyJS modern theme variables */
          .sd-root-modern {
            --sjs-primary-backcolor: #8b5cf6 !important;
            --sjs-primary-backcolor-light: #a78bfa !important;
            --sjs-primary-backcolor-dark: #7c3aed !important;
            --sjs-primary-backcolor-dim: #ede9fe !important;
            --sjs-primary-forecolor: #ffffff !important;
            --sjs-border-default: #e5e7eb !important;
            --sjs-general-backcolor: #ffffff !important;
            --sjs-general-forecolor: #333333 !important;
          }

          /* Progress bar */
          .sd-progress {
            background-color: #f3f4f6 !important;
            border-radius: 4px !important;
            height: 4px !important;
            margin-bottom: 24px !important;
          }

          .sd-progress__bar {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important;
            border-radius: 4px !important;
          }

          /* Buttons */
          .sd-btn,
          .sd-completedpage .sd-btn {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: 8px !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            padding: 14px 24px !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            width: 100% !important;
            margin-top: 20px !important;
          }

          .sd-btn:hover {
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%) !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3) !important;
          }

          /* Checkbox styling */
          .sd-input.sd-checkbox,
          .sd-checkbox input[type="checkbox"] {
            accent-color: #8b5cf6 !important;
          }

          /* Focus states */
          input:focus,
          select:focus,
          textarea:focus {
            border-color: #8b5cf6 !important;
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1) !important;
            outline: none !important;
          }
        `}
      </style>

      <div 
        ref={puck?.dragRef}
        className="max-w-[600px] mx-auto p-5 font-sans bg-white rounded-lg shadow-sm"
      >
        <Survey model={survey} />
      </div>
    </>
  );
};

export default RegistrationForm;
