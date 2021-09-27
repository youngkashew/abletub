import React, { ReactElement, useState, createContext } from "react";
import { Formik, Form } from "formik";
import { Button, Flex, useToast } from "@chakra-ui/react";
import { useCreatePostMutation } from "../generated/graphql";
import validationSchema from "../utils/FormModel/validationSchema";
import postFormModel from "../utils/FormModel/postFormModel";
import formInitialValues from "../utils/FormModel/formInitialValues";
import ImageForm from "components/Forms/ImageForm";
import TrackForm from "components/Forms/TrackForm";
import { Web3Storage } from "web3.storage";
import { useRouter } from "next/router";
import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "utils/createUrqlClient";
import { Layout } from "components/Layout";

export const FormContext = createContext("");

const steps = ["track", "track details"];
const { formId, formField } = postFormModel;

function _renderStepContent(step: number, formProps: any) {
  switch (step) {
    case 0:
      return <TrackForm formField={formField} formProps={formProps} />;
    case 1:
      return <ImageForm formField={formField} formProps={formProps} />;
    default:
      return <ImageForm formField={formField} formProps={formProps} />;
  }
}

interface Props {}

interface FormValues {
  [x: string]: any;
}
// {
//   trackName: string;
//   trackDescription: string;
//   genre: string;
//   mood: string;
//   audio: string;
//   image: string;
// }

function UploadPost({}: Props): ReactElement {
  const [, createPost] = useCreatePostMutation();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const currentValidationSchema = validationSchema[activeStep];
  const isLastStep = activeStep === steps.length - 1;

  const toast = useToast();

  const popToast = async () => {
    toast({
      title: "tub created.",
      description: "your tub may take a few moments to show up",
      status: "success",
      duration: 9000,
      isClosable: true,
    });
  };

  const uploadToIPFS = async (files: File[]) => {
    const getAccessToken = () => {
      return process.env.NEXT_PUBLIC_WEB3_API_TOKEN;
    };

    const makeStorageClient = () => {
      const client = new Web3Storage({ token: getAccessToken() });
      return client;
    };

    const storeFiles = async (files: File[]) => {
      const client = makeStorageClient();
      const cid = await client.put(files);
      console.log("stored files with cid:", cid);
      return cid;
    };

    const result = await storeFiles(files);
    return result;
  };

  const makeFileObject = async (upload: FileList | null) => {
    return await upload![0].arrayBuffer().then((res) => {
      const blob = new Blob([new Uint8Array(res)], { type: "file" });
      const files = [
        // new File(
        //   [`contents of ${upload![0].name}: ${upload![0]}`],
        //   "plain-utf8.txt"
        // ),
        new File([blob], upload![0].name),
      ];
      return files;
    });
  };

  async function _submitForm(values: FormValues, actions: any) {
    const audioFileObj = await makeFileObject(values.audio);
    const audioCID = await uploadToIPFS(audioFileObj);

    const imageFileObj = await makeFileObject(values.image);
    const imageCID = await uploadToIPFS(imageFileObj);

    const { error } = await createPost({
      input: {
        title: values.trackName,
        text: values.trackDescription,
        audioFileName: audioCID,
        imageFileName: imageCID,
      },
    });
    if (error) {
      console.log("error", error);
    } else {
      popToast();
      actions.setSubmitting(false);
      setActiveStep(activeStep + 1);
      router.push("/");
    }
  }

  function _handleSubmit(values: FormValues, actions: any) {
    if (isLastStep) {
      _submitForm(values, actions);
    } else {
      setActiveStep(activeStep + 1);
      actions.setTouched({});
      actions.setSubmitting(false);
    }
  }

  // function _handleBack() {
  //   setActiveStep(activeStep - 1);
  // }

  return (
    <Layout variant="regular">
      <Flex justifyContent="center">
        <Formik
          initialValues={formInitialValues}
          validationSchema={currentValidationSchema}
          onSubmit={_handleSubmit}
        >
          {(FormProps) => (
            <Flex width="100%" justifyContent="center">
              <Form id={formId}>
                {_renderStepContent(activeStep, FormProps)}

                <Flex justifyContent="flex-end">
                  {isLastStep ? (
                    <Button
                      disabled={
                        FormProps.isSubmitting || FormProps.values.image == ""
                      }
                      isLoading={FormProps.isSubmitting}
                      type="submit"
                      colorScheme="pink"
                      variant="solid"
                      m="auto"
                      my={8}
                    >
                      submit
                    </Button>
                  ) : (
                    <Button
                      disabled={
                        FormProps.isSubmitting || FormProps.values.audio == ""
                      }
                      isLoading={FormProps.isSubmitting}
                      type="submit"
                      colorScheme="pink"
                      variant="solid"
                      m="auto"
                      my={8}
                    >
                      next
                    </Button>
                  )}
                </Flex>
              </Form>
            </Flex>
          )}
        </Formik>
      </Flex>
    </Layout>
  );
}

export default withUrqlClient(createUrqlClient)(UploadPost);
