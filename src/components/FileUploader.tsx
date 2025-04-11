import { ChangeEvent, useContext } from "react";
import parse_aha_csv from "../aha/parse";
import './FileUploader.css';
import { ReplayContext } from "../context";

export default function FileUploader() {

    const replayData = useContext(ReplayContext);


    async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        if(e.target.files) {

            const input_file = e.target.files[0];

            const data = parse_aha_csv(await input_file.text());

            if(!data) {
                return console.error("Error parsing CSV file");
            }

            replayData?.setReplayData(data);
        }
    }

    return <div>
        <label htmlFor="file-upload" className="file-upload-button">
            Upload
        </label>
        <input id="file-upload" type="file" onChange={handleFileChange} accept=".csv" className="file-upload-button"/>
    </div>
}