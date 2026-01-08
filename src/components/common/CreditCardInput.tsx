import React from 'react';
import { CreditCardInput } from 'react-native-credit-card-input';

interface CreditCardInputProps {
  onChange: (formData: any) => void;
}

const CreditCardForm = ({ onChange }: CreditCardInputProps) => {
  return (
    <CreditCardInput onChange={onChange} />
  );
};

export default CreditCardForm;