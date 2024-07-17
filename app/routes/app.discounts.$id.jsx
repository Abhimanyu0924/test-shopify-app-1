/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */

import { useActionData,useLoaderData,useSubmit,useNavigate,useNavigation } from "@remix-run/react";
import {useState, useCallback,useEffect} from 'react';
import { authenticate } from "../shopify.server";
import { json,redirect } from "@remix-run/node";
import db from "../db.server";
import {getDiscountTable,getSubDiscountTable,validateForm} from "../models/discounts.server";
import {
    Box,
    Card,
    Layout,
    Link,
    List,
    Page,
    Text,
    BlockStack,
    TextField,
    Grid,
    Select,
    Button,
    Tag
  } from "@shopify/polaris";
  import { TitleBar } from "@shopify/app-bridge-react";

export async function loader({params}){
    
    if(params.id ==="new"){
        return json({
            offerName:"",
        });
    }
    const discountTable = await getDiscountTable(Number(params.id));
    const subDiscountTable = await getSubDiscountTable(Number(params.id));

    return json({
        discountTable,
        subDiscountTable
    });
}

export async function action({request,params}){
    const {admin,session} = await authenticate.admin(request);
    const {shop} = session;

    /**@type {any} */
    const data = {
        ...Object.fromEntries(await request.formData()),
        // shop,
    };

    if(data.action === "delete"){
        await db.discountTable.delete({where:{id : Number(params.id)}});
        await db.subDiscountTable.delete({where:{id : Number(params.id)}});
        return redirect("/app");
    }
    const errors = validateForm(data);
    if(errors){
        return json({errors}, {status:422});
    }

    const discount = 
        params.id ==="new"
        ? await db.discountTable.create({
            shop : shop,
            offerName : data.offerName,
            offerType : data.offerType,
            productName: data.productNames,
            productId : data.productIds ,
            productVariantId : data.variantIds ,
            baselineMargin : data.baseline ,
            bafoMargin : data.bafo ,
            discQuantity : data.discQ ,
            discProducts : data.discP ,
            discAmount : data.discA,
            expectedProfit : data.expetctedProfits || "",
            startDate : data.startDate,
            endDate :data.endDate ,
        })
        : await db.discountTable.update({where : {id : Number(params.id)}}, {
            shop : shop,
            offerName : data.offerName,
            offerType : data.offerType,
            productName: data.productNames,
            productId : data.productIds ,
            productVariantId : data.variantIds ,
            baselineMargin : data.baseline ,
            bafoMargin : data.bafo ,
            discQuantity : data.discQ ,
            discProducts : data.discP ,
            discAmount : data.discA,
            expectedProfit : data.expetctedProfits || "",
            startDate : data.startDate,
            endDate :data.endDate 
        });
        
    
    params.id ==="new"
        ? await db.subDiscountTable.create({
            shop : shop,
            offerName : data.offerName,
            quantity : data.quantity || "",
            discounting : data.discounting || "",
            subDiscount : data.subDiscount,
            discountedAmount : data.discountedAmount || "",
            profitMargin : data.profitMargin || ""
        })
        : await db.subDiscountTable.update({where : {id : Number(params.id)}}, {
            shop : shop,
            offerName : data.offerName,
            quantity : data.quantity || "",
            discounting : data.discounting || "",
            subDiscount : data.subDiscount,
            discountedAmount : data.discountedAmount || "",
            profitMargin : data.profitMargin || ""
         });
        

        return redirect(`/app/discounts/${discount.id}`);

}

export default function discountForm(){
    
    const errors = useActionData()?.errors || {};
    const discounts = useLoaderData();

    const navigate = useNavigate();
    const nav = useNavigation();

    const [formState,setFormState]= useState(discounts);
    const [cleanFormState,setCleanFornState] = useState(discounts);

    const isDirty = JSON.stringify(formState)!== JSON.stringify(cleanFormState);
    const isSaving = nav.state === "submitting" && nav.formData?.get("action") !== "delete";
    const isDeleting = nav.state === "submitting" && nav.formData?.get("action") === "delete";

    async function selectProduct(){
        const products = await window.shopify.resourcePicker({
            type : "product",
            action : "select",
            multiple : "true"
        })
        const productIds = [];
        const productVariants = [];
        const productTitles = [];

        products.forEach(product => {
            productIds.push(product.id);
            productTitles.push(product.title);
            const variants = product.variants.map(variant => (
                variant.id
            ));
            productVariants.push(variants);
        });
        console.log('Product IDs:', JSON.stringify(productIds));
        console.log('Product Variants:', JSON.stringify(productVariants));
        console.log('Product Titles:', JSON.stringify(productTitles));
        setFormState({...formState,
            productIds:JSON.stringify(productIds),
            productTitles:JSON.stringify(productTitles),
            productVariants:JSON.stringify(productVariants),
        })
        
    }

    function renderDiscountExample(value){
        switch (value) {
            case "volumeDiscount":
              return (
                <BlockStack>
                  <ul>
                    <li>Buy 5 or more - get 10% Off</li>
                    <li>Buy 10 or more - get 20% Off</li>
                  </ul>
                </BlockStack>
              );
            case "spendAmountDiscount":
              return (
                <BlockStack>
                  <ul>
                    <li>
                      Spend over $400 on the Summer Collection - get 20% off each
                      Summer Collection item
                    </li>
                    <li>Spend over $100 on Sneakers - get $5.00 off the order</li>
                  </ul>
                </BlockStack>
              );
            case "buyXForAmount":
              return (
                <BlockStack>
                  <ul>
                    <li>3 items from the Summer Collection for $10.00</li>
                    <li>2 shoes for $10.00</li>
                  </ul>
                </BlockStack>
              );
            case "freeShipping":
              return (
                <BlockStack>
                  <ul>
                    <li>Get X quantity to get the free shipping option</li>
                  </ul>
                </BlockStack>
              );
            default:
              return (
                <BlockStack>
                  <ul>
                    <li>Buy 5 or more - get 10% Off</li>
                    <li>Buy 10 or more - get 20% Off</li>
                  </ul>
                </BlockStack>
              );
          }
    }

    const handleStartDateChange = useCallback((value) => {
        const currentDate = new Date().toISOString().split("T")[0];
        if (value < currentDate) {
          return;
        }
        if (value > formState.startDate) {
          setFormState({...formState,startDate : formState.startDate});
        }
        setFormState({...formState,endDate : formState.endDate});
      }, [formState.endDate]);
    
    const handleEndDateChange = useCallback((value) => {
        if (value < formState.startDate) {
          return;
        }
        setFormState({...formState,endDate : formState.endDate});
      }, [formState.startDate]);

    const today = new Date().toISOString().split("T")[0];

    return (
        <Page fullWidth>
            <ui-title-bar title={discounts.id?"Edit discount campaign":"Create discount campaign"}>
                <button variant="breadcrumb" onClick={()=>navigate("/app")}>
                    Discount Designer
                </button>
            </ui-title-bar>
            <Grid >
                <Grid.Cell columnSpan={{xs:3,sm:3,md:3,lg:6,xl:6}}>
                    <Card sectioned>
                        <BlockStack gap="500">
                                <TextField
                                    id="offerName"
                                    label="Offer Name"
                                    autoComplete="off"
                                    value={formState.offerName}
                                    onChange={(e) => {
                                        const inputOfferName = e.target.value;
                                        if (inputOfferName.length >= 3 && inputOfferName.length <= 40) {
                                            setFormState({ ...formState, offerName: inputOfferName });
                                                }
                                            }}
                                    error={errors.offerName}/>
                        </BlockStack>
                        <BlockStack gap="500">
                                <Select
                                label="Offer Type"
                                options={[
                                  { label: "Volume Discount", value: "volumeDiscount" },
                                  { label: "Spend Amount Discount", value: "spendAmountDiscount" },
                                  { label: "Buy X For $", value: "buyXForAmount" },
                                  { label: "Free Shipping", value: "freeShipping" },
                                ]}
                                value={formState.offerType}
                                onChange={(value) => setFormState({ ...formState, offerType : value })}
                                />
                                <Text>Example : </Text>
                                <div style={{ marginTop: "10px" }}>{renderDiscountExample(formState.offerType)}</div>
                        </BlockStack >
                        <BlockStack gap="500">     
                            Select Product  
                            <Button 
                            id="products"
                            onClick={selectProduct}
                            >
                            Select Products
                            </Button>
                            <Text></Text>
                            <BlockStack gap="500">
                            <TextField
                                type="date"
                                value={formState.startDate}
                                label="Start Date"
                                onChange={handleStartDateChange}
                                min={today}  
                            />
                            <TextField
                                type="date"
                                value={formState.endDate}
                                label="End Date"
                                onChange={handleEndDateChange}
                                min={formState.startDate}
                            />
                            </BlockStack>
                        </BlockStack> 
                    </Card>
                </Grid.Cell>
            </Grid>
        </Page>
    );
}
