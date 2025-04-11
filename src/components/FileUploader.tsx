import { ChangeEvent, useState } from "react";
import parse_aha_csv from "../aha/parse";
import './FileUploader.css';

export default function FileUploader() {

    const [file, setFile] = useState<File | null>();

    async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        if(e.target.files) {

            const input_file = e.target.files[0];

            setFile(input_file);
            const data = parse_aha_csv(await input_file.text());
            console.log(data);
        }
    }

    return <div>
        <label htmlFor="file-upload" className="file-upload-button">
            Upload
        </label>
        <input id="file-upload" type="file" onChange={handleFileChange} accept=".csv" className="file-upload-button"/>
    </div>
}