const fs = require('fs').promises;
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { createClient } = require("@supabase/supabase-js");
const { SupabaseVectorStore } = require("@langchain/community/vectorstores/supabase");
const { OpenAIEmbeddings } = require("@langchain/openai");

async function processFile() {
  try {
    console.log('Reading the file...');
    // Read the file content as a string
    const text = await fs.readFile("ad tech idea.txt", "utf8");
    console.log('File read successfully.');

    console.log('Initializing the text splitter...');
    // Initialize the text splitter
    const splitter = new RecursiveCharacterTextSplitter();

    console.log('Splitting the text into documents...');
    // Split the text into documents
    const output = await splitter.createDocuments([text]);
    console.log(`Text split into ${output.length} documents.`);

    const sbApiKey = process.env.SUPABASE_PRIVATE_KEY;
    const sbUrl = process.env.SUPABASE_URL;
    const openAiKey = process.env.OPENAI_API_KEY;

    console.log('Creating Supabase client...');
    const client = createClient(sbUrl, sbApiKey);

    console.log('Storing documents in Supabase...');
    await SupabaseVectorStore.fromDocuments(
      output,
      new OpenAIEmbeddings({ openAiKey }),
      {
        client,
        tableName: "documents"
      }
    );
    console.log('Documents stored successfully.');

    // Optional: Log the output if needed
    // console.log(output);

  } catch (err) {
    // Log any errors that occur
    console.error('Error:', err);
    throw err; // Rethrow the error to be handled by the calling function
  }
}

module.exports = processFile;
