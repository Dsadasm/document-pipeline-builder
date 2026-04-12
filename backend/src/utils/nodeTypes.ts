export interface NodeType {
    name: string;
    inputDataType: string;
    outputDataType: string;
    allowedCycleTarget: string | null;
}

const nodeTypesData: NodeType[] = [
    {
        name: 'file_upload',
        inputDataType: 'None',
        outputDataType: 'Image/PDF',
        allowedCycleTarget: null,
    },
    {
        name: 'ocr',
        inputDataType: 'Image/PDF',
        outputDataType: 'Text',
        allowedCycleTarget: null,
    },
    {
        name: 'summarize',
        inputDataType: 'Text',
        outputDataType: 'Text',
        allowedCycleTarget: null,
    },
    {
        name: 'document_merger',
        inputDataType: 'None', // Special handling - takes 2 inputs
        outputDataType: 'Text',
        allowedCycleTarget: null,
    },
    {
        name: 'human_review',
        inputDataType: 'Text',
        outputDataType: 'Text',
        allowedCycleTarget: 'text_correction',
    },
    {
        name: 'text_correction',
        inputDataType: 'Text',
        outputDataType: 'Text',
        allowedCycleTarget: null,
    },
    {
        name: 'image_resize',
        inputDataType: 'Image',
        outputDataType: 'Image',
        allowedCycleTarget: null,
    },
    {
        name: 'email',
        inputDataType: 'Text',
        outputDataType: 'None',
        allowedCycleTarget: null,
    },
];

export default nodeTypesData