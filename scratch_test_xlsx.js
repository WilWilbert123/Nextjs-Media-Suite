import * as XLSX from "xlsx";

const html = `
  <table>
    <tr><th>Name</th><th>Age</th></tr>
    <tr><td>Wilbert</td><td>30</td></tr>
  </table>
`;

try {
  const wb = XLSX.read(html, { type: "string" });
  console.log("Sheet names:", wb.SheetNames);
} catch (e) {
  console.error(e);
}
