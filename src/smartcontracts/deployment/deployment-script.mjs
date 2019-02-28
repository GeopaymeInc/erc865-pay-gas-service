import {deployContractsAndSaveAddressesAndABIs} from "./deploy-contracts-and-save.mjs";
import {finishMinting, mintTokens, setAdmins} from "../methods/token-minting.mjs";

const run = async () => {
  const [tokenContract, serviceContract] = await deployContractsAndSaveAddressesAndABIs();
  await mintTokens(tokenContract)
    .then(() =>{
      console.log('The DOS tokens have been minted.');
    });
  await setAdmins(tokenContract)
    .then(() =>{
      console.log('Admins set.');
    });
  await finishMinting(tokenContract)
    .then(() => {
      console.log('The minting has been finished.');
    });
  process.exit();
};

run();