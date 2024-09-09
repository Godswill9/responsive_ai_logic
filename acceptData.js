require('dotenv').config();

const express = require('express');
const router = express.Router();
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { ChatOpenAI } = require('@langchain/openai');
const processFile = require('./fileProcessor');
const {StringOutputParser} = require("@langchain/core/output_parsers")
const model = new ChatOpenAI({ model: "gpt-4" });
const { createClient } = require("@supabase/supabase-js");
const { SupabaseVectorStore } = require("@langchain/community/vectorstores/supabase");
const { OpenAIEmbeddings } = require("@langchain/openai");
const {RunnablePassthrough, RunnableSequence} =  require('@langchain/core/runnables'); 

const conv_history = []

const openAiKey = process.env.OPENAI_API_KEY; 
const sbApiKey = process.env.SUPABASE_PRIVATE_KEY;
const sbUrl = process.env.SUPABASE_URL;
console.log('Creating Supabase client...');
const client = createClient(sbUrl, sbApiKey);

var embeddings = new OpenAIEmbeddings({openAiKey})
const vectorstore=new SupabaseVectorStore(embeddings,{
   client, 
   tableName:"documents",
   queryName:"match_documents"
})
const retriever  = vectorstore.asRetriever()


//preparing question template
  var standaloneQuestionTemplate= `Given some conversation history (if any) and a question, convert the question to a standalone question.
  conversation history: {conv_history}
  Question: {question} standalone question:`
  
  var standaloneQuestionPrompt=ChatPromptTemplate.fromTemplate(standaloneQuestionTemplate)


  //preparing answer template
  var answerTemplate= `You are a helpful and enthusiastic support bot who can answer a given question about 
  Asoro automotive based on the context provided and the coversation history. Try to find the answer in the context. If the answer is 
  not given in the context, find the answer in the conversation history if possible. If you really 
  don't know the answer, say "I'm sorry, i don't know the answer to that." And direct the questioner to email help at ghycith9@gmail.com. 
  Don't try to make up an answer. Always speak as if you were chatting to a friend.
  context: {context}
  conversation history: {conv_history}
  question: {question}
  answer:
    `
  const answerPrompt=ChatPromptTemplate.fromTemplate(answerTemplate)


  // function to combineDocuments from the database
  function combineDocuments(docs){
    return docs.map((doc)=>doc.pageContent).join('\n\n')
  }


  //preparing chains
  //preparing chains
const standaloneQuestionChain= standaloneQuestionPrompt.pipe(model).pipe(new StringOutputParser())
const retrieverChain=RunnableSequence.from([
    prevResult => prevResult.standalone_question,
    retriever,
    combineDocuments
 ])
const answerChain = answerPrompt.pipe(model).pipe(new StringOutputParser())  

  //main chain
  //main chain
  var chain= RunnableSequence.from([
    {
      standalone_question: standaloneQuestionChain,
      original_input: new RunnablePassthrough()
    },
    {
      context: retrieverChain,
      question:({original_input})=> original_input.question,
      conv_history:({original_input})=> original_input.conv_history
    },
    answerChain
  ])
// var chain= standaloneQuestionPrompt.pipe(model).pipe(new StringOutputParser()).pipe(retriever).pipe(combineDocuments).pipe(answerPrompt)



//setting conversation history
const prepareHistory = (arr) => {
  return arr.map((message, i) => {
    return i % 2 === 0 ? `user: ${message}` : `ai: ${message}`;
  }).join('\n'); // Join messages with new lines
};



// The route to process the file
router.post('/get_chat', async (req, res) => {
  try {
    const userMessage = req.body.message
    conv_history.push(userMessage)
  
  
    var responseValue=await chain.invoke({
        question:userMessage,
        conv_history: prepareHistory(conv_history)
    })
    
    console.log(responseValue)
    conv_history.push(responseValue)
    res.status(200).send('File processed successfully.');
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send('Error processing file.');
  }
});



// The route to post the new file content
router.get('/ai_content', async (req, res) => {
  try {
    await processFile();  //for postig vector data to the dataase
    res.status(200).send('File processed successfully.');
  } catch (error) {
    console.error('Error posting file:', error);
    res.status(500).send('Error processing file.');
  }
});

module.exports = router;
