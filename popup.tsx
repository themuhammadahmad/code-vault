import { useState } from "react";
import qrcode from "qrcode";
import { FaCopy } from "react-icons/fa";
import QrScanner from "qr-scanner";
import crypto from "crypto"; // Built-in Node.js library
import "./styles.css";

function IndexPopup() {
  const [input, setInput] = useState(""); // User data input
  const [qrCode, setQrCode] = useState(""); // Generated QR code
  const [secretKey, setSecretKey] = useState(""); // Secret key input
  const [decodedMessage, setDecodedMessage] = useState(""); // Decoded message
  const [activeTab, setActiveTab] = useState("encode");
  const [file, setFile] = useState(null); // File state for decoding
  const [error, setError] = useState("");
  const algorithm = "aes-256-cbc"; // Encryption algorithm
  const iv = crypto.randomBytes(16); // Initialization vector
  const [errorFields, setErrorFields] = useState({text: "", secretKey: ""});

  const encryptData = (data, secretKey) => {
    const key = crypto.createHash("sha256").update(secretKey).digest(); // Ensure key length is 256 bits
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`; // Include IV for decryption
  };

  const decryptData = (encryptedData, secretKey) => {
    const parts = encryptedData.split(":");
    if (parts.length !== 2) {
      console.log("Invalid encrypted data format");
      return {success: false, message: "Decryption failed: Invalid data format"};
    }

    const [ivHex, encryptedText] = parts;
    if (ivHex.length !== 32) {
      console.log("Invalid IV length");
      return {success: false, message: "Decryption failed: Invalid IV length"};
    }

    const key = crypto.createHash("sha256").update(secretKey).digest();
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivHex, "hex"));

    try {
      let decrypted = decipher.update(encryptedText, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return {success: true, decrypted};
    } catch (error) {
      return {success: false, message: "Decryption failed: " + error.message};
    }
  };

  const generateQRCode = async (data) => {
    try {
      const url = await qrcode.toDataURL(data);
      setQrCode(url);
    } catch (error) {
      setError("Error generating QR code: " + error.message);
      console.log("Error generating QR code:", error);
    }
  };

  const handleSubmit = () => {
    if(input.length == 0){
      setErrorFields({...errorFields, text: "Please enter text"});
      return
    }
    if(secretKey.length == 0){
      setErrorFields({text: "", secretKey: "Please enter secret key"});
      return
    }
    if (input && secretKey) {
      setErrorFields({ text: "", secretKey: "" });
      const encryptedString = encryptData(input, secretKey);
      generateQRCode(encryptedString);
    } else {
      alert("Please provide both data and secret key.");
    }
  };

  const handleDecode = async () => {
    if (!file || !secretKey) {
      alert("Please provide a QR code image and a secret key.");
      return;
    }

    try {
      const scanResult = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      const decodedQRCode = scanResult.data;
      const finalResult = decryptData(decodedQRCode, secretKey);
      if(!finalResult?.success){
        setError(finalResult?.message);
      }else{
        setDecodedMessage(finalResult.decrypted);
      }
    } catch (error) {
      console.log("Error decoding QR code:", error);
    }
  };

  let [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(decodedMessage);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  let handleDownloadBtn = () => {
    const link = document.createElement("a");
    link.href = qrCode;
    link.download = "qrcode.png";
    link.click();
  }
  return (
    <div className="main" >
      <div className="btn-group">
        <button className={activeTab === "encode" ? "active" : ""} onClick={() => setActiveTab("encode")}>Encode</button>
        <button className={activeTab === "encode" ? "" : "active"} onClick={() => setActiveTab("decode")}>Decode</button>
      </div>

      <div className="container" style={activeTab === "encode" ? { transform: "translateX(0)" } : { transform: "translateX(-350px)" }}>
        {/* Encode Tab */}
        <div id="encode-info-tab">
          <h2>Generate QR Code</h2>
          <div style={{width: "100%"}}>
            <textarea className="data-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter text for QR code" />
           {errorFields.text && <span className="error">{errorFields.text}</span>}
          </div>
          <div style={{width: "100%"}}>
            <input type="text" className="secret-key-input" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="Enter secret key" />
           {errorFields.secretKey && <span className="error">{errorFields.secretKey}</span>}
          </div>
          <button onClick={handleSubmit}>Generate QR Code</button>
           {error && <p className="error">{error}</p>}
          {qrCode && (
            <div className="qr-code-container">
              <h3>Generated QR Code:</h3>
              <img width={"100%"} src={qrCode} alt="QR Code" />
              <button onClick={handleDownloadBtn}>Download Image</button>
            </div>
          )}
        </div>

        {/* Decode Tab */}
        <div id="decode-code-tab">
          <h2>Decode QR Code</h2>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
          <input type="text" className="secret-key-input" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="Enter secret key" />
          <button onClick={handleDecode}>Decode</button>
          {error && <p className="error">{error}</p>}
          {decodedMessage && (
            <div className="message-container">
              <h3>Decoded Message:</h3>
              <p title="copy to clipboard">
                {copied ? (<span className="copied">Copied</span>) : (<></>)}
                {/* <br /> */}
                {decodedMessage}
                {/* <br /> */}
                <button className="copy-btn" onClick={handleCopy}><FaCopy /></button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IndexPopup;
