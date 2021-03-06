import React, { Component } from "react";
import styled from "styled-components";
import { InputField } from "../../views/design-components/Inputs.js";
import Button from "../../views/design-components/Button.js";
import secp256k1 from "secp256k1";
import { Web3Context } from "../../contexts/Web3Context.js";
import { getDomain } from "../../../helpers/getDomain.mjs";
import { withRouter } from "react-router-dom";
import { __GRAY_200, __THIRD } from "../../helpers/colors.js";
import Select from "react-select";
import { isServiceContractAddress } from "../../helpers/isServiceContractAddress.js";
import { upsertFromAddressesLocalStorage } from "../../helpers/saveUserAddressInLocalStorage.js";
import Web3Providers from "../../web3/Web3Providers.mjs";
import web3, { web3Provider } from "../../../helpers/web3Instance.mjs";
import getEthereumAccounts from "../../../helpers/get-ethereum-accounts.mjs";
import toast from "../../views/design-components/Notification/Toast.js";
import { getTransaction } from "../MyTransactions/MyTransactionsMethods.js";
import { timeout } from "../../../helpers/timeout.mjs";
import { TRANSACTION_STATUS } from "../../../backend/db/transaction-states.mjs";
import config from "../../../config.json";

import { QRCodeSection } from "./QRCodeSection.jsx";
import Icon from "../../views/icons/Icon.js";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 512px;
`;

const Row = styled.div`
  display: flex;
  flex-direction: row;
  margin-top: 20px;
`;

const RowCentered = styled(Row)`
  align-items: center; //vertical  alignment
`;

const LeftComponent = styled.div`
  width: 18%;
  margin-right: 10px;
`;

const BoldLeftComponent = styled(LeftComponent)`
  font-weight: bold;
`;

const BoldFee = styled.div`
  font-weight: bold;
`;

const AmountInput = styled(InputField)`
  margin-right: 10px;
`;

const AddressInputField = styled(InputField)`
  width: 100%;
`;

const AmountContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const Fee = styled.span`
  font-style: italic;
  margin-left: 5px;
  margin-right: 5px;
`;

const Padded = styled.div`
  padding-left: 8px;
`;

const PKInputField = styled(InputField)``;

const PrivateKeyInfo = styled.div`
  font-style: italic;
  margin-left: 10px;
  font-size: 10px;
  line-height: 1.6;
  margin-top: 3px;
`;

const RowMultiLines = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 20px;
`;

const WideButton = styled(Button)`
  margin-top: 35px;
  ${props =>
    !props.disabled
      ? ""
      : `
    opacity: 0.4
  `}
`;

export const QRCodeButton = styled(Button)`
  margin-top: 10px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CustomSelect = styled(Select)`
  width: 100%;
  &:focus {
    box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  transition: box-shadow 0.15s ease;
  box-shadow: 0 1px 3px rgba(50, 50, 93, 0.15), 0 1px 0 rgba(0, 0, 0, 0.02);
`;

export const polling = async txHash => {
  await timeout(2000);
  let tx = await getTransaction(txHash)
    .then(response => response.json())
    .then(response => {
      if (response.success) {
        return response.data;
      }
    });

  switch (tx.status) {
    case TRANSACTION_STATUS.PENDING:
      polling(txHash);
      break;
    case TRANSACTION_STATUS.CONFIRMED:
      toast.success("Your transactions has been successfully mined.");
      break;
    case TRANSACTION_STATUS.REVERTED:
      toast.error(
        "Your transactions has been mined but the action was not successful."
      );
      break;
    case TRANSACTION_STATUS.ERROR:
      toast.error("Something went wrong with your transaction.");
      break;
    case TRANSACTION_STATUS.OUT_OF_GAS:
      toast.error(
        "Your transaction could not be mined because it ran out of gas."
      );
      break;
    default:
      toast.info("Your transaction is not pending anymore.");
  }
};

export const callService = (method, transactionObject) => {
  fetch(`${getDomain()}/api/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(transactionObject)
  })
    .then(response => response.json())
    .then(response => {
      console.log("response", response);
      if (response.success) {
        const tx = response.data.txHash;
        toast.info(
          "The service successfully sent the transaction to the blockchain. TxHash: " +
            tx.substring(0, 6) +
            "..." +
            tx.substring(tx.length - 4)
        );
        polling(tx);
      } else {
        toast.error(
          "Something went wrong. The service was not able to send your transaction to the blockchain."
        );
      }
    })
    .catch(err => {
      console.log("something went wrong: ", err);
      toast.error(
        "Something went wrong. The service was not able to send your transaction to the blockchain."
      );
    });
};

class Transfer extends Component {
  constructor() {
    super();
    this.state = {
      // transfer data
      tokenContracts: [],
      selectedTokenContract: "",
      signature: "",
      from: "",
      isFromValid: true,
      to: "",
      isToValid: true,
      value: "",
      isValueValid: true,
      nonce: 0,
      privateKey: "",
      showPrivateKey: true,
      qrCodeSection: false
    };
  }

  async componentDidMount() {
    let tokenContracts = this.context.tokenContracts.map((c, index) => {
      return {
        value: c,
        label: c.name,
        index
      };
    });
    this.setState({
      tokenContracts,
      selectedTokenContract: tokenContracts[0],
      nonce: 0,
      // testing purposes
      value: 400,
      isValueValid: true,
      from: web3Provider === Web3Providers.NO_PROVIDER ? '' : await getEthereumAccounts(web3).then(accounts => {return accounts[0]}),
      // from: "0x7b9A6bf86BB7317DF7562106eCc45ad49acFaAeb", // deactivate MetaMask again
      isFromValid: true,
      to: "",
      isToValid: true,
      privateKey:
        "" //"95FE3783808009AFDA9A614D46511E304FD435C7E0ECE24A52E20D0A16C50C8F" // from 0x7b9A6bf86BB7317DF7562106eCc45ad49acFaAeb
    });
  }

  handleQRCodeScan(data) {
    console.log("reading data", data);
    if (data) {
      try {
        data = JSON.parse(data);
      } catch (error) {
        this.setState({
          privateKey: data,
          qrCodeSection: false,
          showPrivateKey: false
        });
      }
      if (data.tokenAddress) {
        let index = this.context.tokenContracts.findIndex(tc => {
          return tc.contractObj.options.address === data.tokenAddress;
        });

        const fromAccount = web3.eth.accounts.privateKeyToAccount(
          web3.utils.isHexStrict(data.pk) ? data.pk : "0x" + data.pk
        );

        this.setState({
          selectedTokenContract: this.state.tokenContracts[index],
          value: data.value,
          from: fromAccount.address,
          privateKey: fromAccount.privateKey,
          to: data.to,
          qrCodeSection: false,
          showPrivateKey: false
        });
        this.validateAddress("isToValid", data.to);

        if (
          data.methodName ||
          isServiceContractAddress(this.context.serviceContracts, data.to)
        )
          this.props.history.push(`/transferAndCall`, {
            tokenContractIndex: index,
            to: data.to,
            value: data.value,
            from: fromAccount.address,
            privateKey: fromAccount.privateKey,
            methodName: data.methodName
          });
      } else {
        this.setState({
          privateKey: data,
          qrCodeSection: false,
          showPrivateKey: false
        });
      }
    }
  }

  handleInput(stateKey, e) {
    this.setState({ [stateKey]: e.target.value });
  }

  handleTokenContractChange(selectedTokenContract) {
    this.setState({
      selectedTokenContract
    });
  }

  validateAddress(stateKey, value) {
    if (this.context.web3.utils.isAddress(value)) {
      this.setState({ [stateKey]: true });
    } else {
      this.setState({ [stateKey]: false });
    }
  }

  async signTransactionData() {
    const nonce = Date.now();
    // transferPreSignedHashing from Utils.sol
    // function transferPreSignedHashing(address _token, address _to, uint256 _value, uint256 _fee, uint256 _nonce)
    // return keccak256(abi.encode(bytes4(0x15420b71), _token, _to, _value, _fee, _nonce));
    const input = this.context.web3.eth.abi.encodeParameters(
      ["bytes4", "address", "address", "uint256", "uint256", "uint256"],
      [
        "0x15420b71",
        this.state.selectedTokenContract.value.contractObj.options.address,
        this.state.to,
        this.state.value.toString(),
        this.state.selectedTokenContract.value.feeTransfer.toString(),
        nonce.toString()
      ]
    );

    const inputHash = this.context.web3.utils.keccak256(input);
    const privateKey =
      this.state.privateKey.substring(0, 2) === "0x"
        ? this.state.privateKey.substring(2)
        : this.state.privateKey;

    const signObj =
      this.state.selectedTokenContract.value.signMethod === "personalSign"
        ? await web3.eth.personal.sign(inputHash.substring(2), this.state.from)
        : secp256k1.sign(
            Buffer.from(inputHash.substring(2), "hex"),
            Buffer.from(privateKey, "hex")
          );

    const signatureInHex =
      "0x" +
      signObj.signature.toString("hex") +
      (signObj.recovery + 27).toString(16);

    this.setState({
      signature: signatureInHex,
      nonce
    });
  }

  sendSignedTransaction() {
    let transactionObject = {
      tokenContractIndex: this.state.selectedTokenContract.index,
      signature: this.state.signature,
      from: this.state.from,
      to: this.state.to,
      value: this.state.value,
      fee: this.state.selectedTokenContract.value.feeTransfer,
      nonce: this.state.nonce
    };
    console.log("sending this object: ", transactionObject);
    callService("transfer", transactionObject);
  }

  render() {
    return (
      <Container>
        <FormContainer>
          <QRCodeButton
            onClick={() => {
              this.setState({ qrCodeSection: true });
            }}
          >
            <Icon icon={"qr-scanner"} height={35} color={"white"} right={13} />
            Scan QR Code instead of filling the form
          </QRCodeButton>
          {this.state.qrCodeSection ? (
            <QRCodeSection
              handleScan={data => {
                this.handleQRCodeScan(data);
              }}
              handleError={error => {
                console.error("did not work", error);
              }}
            />
          ) : null}
          <RowCentered>
            <LeftComponent>
              <AmountInput
                placeholder={"Amount"}
                value={this.state.value}
                onChange={e => this.handleInput("value", e)}
              />
            </LeftComponent>
            <CustomSelect
              className="basic-single"
              classNamePrefix="select"
              // defaultValue={this.state.selectedMethod}
              value={this.state.selectedTokenContract}
              onChange={e => this.handleTokenContractChange(e)}
              isDisabled={false}
              isLoading={false}
              isClearable={false}
              isRtl={false}
              isSearchable={true}
              name="Token Contract"
              options={this.state.tokenContracts}
              styles={{
                control: styles => ({
                  ...styles,
                  backgroundColor: "white",
                  borderRadius: "0.25rem",
                  transition: "box-shadow 0.15s ease",
                  boxShadow:
                    "0 1px 3px rgba(50, 50, 93, 0.15), 0 1px 0 rgba(0, 0, 0, 0.02)",
                  color: __THIRD,
                  borderColor: __GRAY_200,
                  border: "1px solid " + __GRAY_200
                }),
                input: styles => ({ ...styles, fontColor: __THIRD }),
                singleValue: (styles, { data }) => ({
                  ...styles,
                  color: __THIRD
                })
              }}
            />
          </RowCentered>
          <RowCentered>
            <LeftComponent>From:</LeftComponent>
            <AddressInputField
              placeholder={"From Address"}
              value={this.state.from}
              onChange={e => {
                this.handleInput("from", e);
                this.validateAddress("isFromValid", e.target.value);
              }}
            />
          </RowCentered>
          <RowCentered>
            <LeftComponent>To:</LeftComponent>
            <AddressInputField
              placeholder={"To Address"}
              value={this.state.to}
              onChange={e => {
                this.handleInput("to", e);
                this.validateAddress("isToValid", e.target.value);
                if (
                  isServiceContractAddress(
                    this.context.serviceContracts,
                    e.target.value
                  )
                )
                  this.props.history.push(`/transferAndCall`, {
                    // tokenContracts: this.state.tokenContracts,
                    to: e.target.value,
                    value: this.state.value,
                    from: this.state.from,
                    privateKey: this.state.privateKey,
                    // methodName: this.state.methodName,
                    tokenContractIndex: this.state.selectedTokenContract.index
                  });
              }}
            />
          </RowCentered>
          <Row>
            <LeftComponent>Transaction fee:</LeftComponent>
            <AmountContainer>
              <div>
                <Fee>
                  {this.state.selectedTokenContract &&
                    this.state.selectedTokenContract.value.feeTransfer}
                </Fee>{" "}
                {this.state.selectedTokenContract &&
                  this.state.selectedTokenContract.value.symbol}
              </div>
              <Padded>
                {"≈"}
                <Fee>
                  {this.state.selectedTokenContract &&
                    this.state.selectedTokenContract.value.feeTransfer *
                      this.state.selectedTokenContract.value
                        .defaultTokenToEthPrice}
                </Fee>{" "}
                ETH
              </Padded>
              <Padded>
                {"≈"}
                <Fee>
                  {this.state.selectedTokenContract &&
                    Math.round(
                      100 *
                        this.state.selectedTokenContract.value.feeTransfer *
                        this.state.selectedTokenContract.value
                          .defaultTokenToEthPrice *
                        config.currentEthUsdPrice
                    ) / 100}
                </Fee>{" "}
                USD
              </Padded>
            </AmountContainer>
          </Row>
          <Row>
            <BoldLeftComponent>Token total:</BoldLeftComponent>
            <AmountContainer>
              <BoldFee>
                <Fee>
                  {this.state.selectedTokenContract &&
                    this.state.selectedTokenContract.value.feeTransfer +
                      parseInt(this.state.value ? this.state.value : 0)}
                </Fee>{" "}
                {this.state.selectedTokenContract &&
                  this.state.selectedTokenContract.value.symbol}
              </BoldFee>
              <Padded>
                {"≈"}
                <Fee>
                  {this.state.selectedTokenContract &&
                    Math.round(
                      10000 *
                        (this.state.selectedTokenContract.value.feeTransfer +
                          parseInt(this.state.value ? this.state.value : 0)) *
                        this.state.selectedTokenContract.value
                          .defaultTokenToEthPrice
                    ) / 10000}
                </Fee>{" "}
                ETH
              </Padded>
              <Padded>
                {"≈"}
                <Fee>
                  {this.state.selectedTokenContract &&
                    Math.round(
                      100 *
                        (this.state.selectedTokenContract.value.feeTransfer +
                          this.state.value) *
                        this.state.selectedTokenContract.value
                          .defaultTokenToEthPrice *
                        config.currentEthUsdPrice
                    ) / 100}
                </Fee>{" "}
                USD
              </Padded>
            </AmountContainer>
          </Row>
          <RowMultiLines>
            {this.state.showPrivateKey ? (
              <>
                <PKInputField
                  placeholder={"Private key of the from address"}
                  value={this.state.privateKey}
                  onChange={e => this.handleInput("privateKey", e)}
                />
                <PrivateKeyInfo>
                  Your private key is only used to sign the entered transation
                  data. It is neither stored nor send somewhere.
                </PrivateKeyInfo>
              </>
            ) : null}
          </RowMultiLines>
          <WideButton
            disabled={
              !(
                this.state.isValueValid &&
                this.state.isToValid &&
                this.state.isFromValid
              )
            }
            onClick={async () => {
              await this.signTransactionData();
              this.sendSignedTransaction();
              upsertFromAddressesLocalStorage(this.state.from);
            }}
          >
            Send
          </WideButton>
        </FormContainer>
      </Container>
    );
  }
}

Transfer.contextType = Web3Context;

export default withRouter(Transfer);
