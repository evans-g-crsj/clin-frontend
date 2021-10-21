import { AutoComplete, Button, Col, Form, FormInstance, Input, Modal, Row, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import React, { useState, useRef } from 'react';
import intl from 'react-intl-universal';
import {
  PractitionerData,
  mapPractitionerToOption,
  buildPractitionerValue,
} from '../Practitioners';
import { searchPractitioner } from '../SecondPage';
import './styles.scss';
import { PractitionerRole } from 'helpers/fhir/types';
import { isPractitionerResident } from '../../../../../helpers/fhir/PractitionerRoleHelper';

interface Props {
  open: boolean;
  role: PractitionerRole;
  doctorOptions: {
    optionSelected: (value: PractitionerData | undefined) => void;
  };
  onSubmit: () => void;
  onClose: () => void;
}

const SubmissionModal: React.FC<Props> = ({ open, role, doctorOptions, onSubmit, onClose }) => {
  const [form] = Form.useForm();
  const isResident = isPractitionerResident(role);
  const [supervisor, setSupervisor] = useState<PractitionerData>();
  const [doctors, setDoctors] = useState<PractitionerData[]>([]);

  const searchTermChanged = async (term: string) => {
    setDoctors(await searchPractitioner(term));
  };

  const requireFormValidation = isResident;
  const isFormValid = () => !requireFormValidation || supervisor !== undefined;

  const handleSubmit = () => {
    if (requireFormValidation) {
      form.validateFields().then((_) => {
        doctorOptions.optionSelected(supervisor);
        onSubmit();
      });
    } else {
      onSubmit();
    }
  };

  return (
    <Modal
      afterClose={onClose}
      visible={open}
      onCancel={onClose}
      title={intl.get('form.patientSubmission.submissionModal.title')}
      footer={
        <Row gutter={8} justify="end">
          <Col>
            <Button onClick={onClose}>
              {intl.get('form.patientSubmission.submissionModal.actions.cancel')}
            </Button>
          </Col>
          <Col>
            <Button type="primary" onClick={handleSubmit} disabled={!isFormValid()}>
              {intl.get('form.patientSubmission.submissionModal.actions.submit')}
            </Button>
          </Col>
        </Row>
      }
    >
      <Row className="submission-modal">
        <p>
          <Typography.Text>
            {intl.get('form.patientSubmission.submissionModal.description')}
          </Typography.Text>
        </p>
        {isResident && (
          <Row>
            <p>
              <Typography.Text strong>
                {intl.get('form.patientSubmission.submissionModal.supervisor.text')}
              </Typography.Text>
            </p>
            <Form form={form}>
              <Form.Item
                name="supervisor"
                rules={[
                  {
                    required: true,
                    message: intl.get('form.patientSubmission.submissionModal.supervisor.required'),
                  },
                ]}
              >
                <AutoComplete
                  allowClear
                  options={doctors.map(mapPractitionerToOption)}
                  onSelect={(selectedValue: string) => {
                    const practitionerSelected = doctors.find(
                      (r) => buildPractitionerValue(r) === selectedValue,
                    );
                    if (practitionerSelected != null) {
                      setSupervisor(practitionerSelected);
                    }
                  }}
                  onSearch={(value: string) => {
                    if (value === '') {
                      setSupervisor(undefined);
                    }
                    searchTermChanged(value);
                  }}
                >
                  <Input
                    suffix={<SearchOutlined />}
                    placeholder={intl.get(
                      'form.patientSubmission.form.prescribingDoctor.placeholder',
                    )}
                  />
                </AutoComplete>
              </Form.Item>
            </Form>
          </Row>
        )}
      </Row>
    </Modal>
  );
};

export default SubmissionModal;
