import * as XLSX from 'xlsx';

export const extractDataFromFile = (file: any) => {
    try {
        const extension = file.originalname.split('.').pop().toLowerCase();
        const allowedExtensions = ['xlsx', 'xls', 'csv'];

        if (!allowedExtensions.includes(extension)) {
            return { error: (`Only .xlsx, .xls, and .csv are allowed. the Formate .${extension} is not valid!`) };
        }

        const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Use header: 1 to get raw array of arrays
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        if (!rawData || rawData.length < 1) {
            return { data: [] };
        }

        const headers = rawData[0].map((h: any) => String(h || "").trim());
        const data = rawData.slice(1).map((row: any[]) => {
            const rowData: any = {};
            let hasData = false;
            headers.forEach((header, index) => {
                if (!header) return;
                
                let value = row[index];
                if (typeof value === 'string') {
                    value = value.trim();
                }
                
                rowData[header] = value;
                if (value !== undefined && value !== null && value !== "") {
                    hasData = true;
                }
            });
            return hasData ? rowData : null;
        }).filter(item => item !== null);

        return { data };
    } catch (error) {
        console.error("Error extracting data from file:", error);
        return { error: "Failed to extract data from the file. Please ensure it's a valid Excel or CSV file." };
    }
};
