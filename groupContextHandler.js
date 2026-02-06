// Extract customer context from group name
function getCustomerContextFromGroup(groupName) {
    if (!groupName) return null;

    const lowerName = groupName.toLowerCase();

    // Map common group name patterns to customer codes
    // This is a fuzzy matcher - add more patterns as needed
    const customerMappings = [
        // Exact matches
        { patterns: ['allied sea products', 'allied sea', 'allied'], code: '300-A004', name: 'ALLIED SEA PRODUCTS SDN BHD' },
        { patterns: ['sinchoiwah', 'sin choi wah', 'scw'], code: '300-S009', name: 'SINCHOIWAH RESTAURANT SDN BHD' },
        { patterns: ['tekkah', 'tekkah frozen'], code: '300-T025', name: 'TEKKAH FROZEN SEAFOOD' },
        { patterns: ['hong soon', 'hong soon frozen'], code: '300-H022', name: 'HONG SOON FROZEN FOOD SDN BHD' },
        { patterns: ['chef tam', 'tam'], code: '300-C012', name: 'CHEF TAM CANTONESE CUISINE' },
        { patterns: ['gerai kok hing', 'kok hing'], code: '300-G008', name: 'GERAI KOK HING' },
        { patterns: ['yoongsingfa', 'yoong sing fa'], code: '300-Y009', name: 'YOONGSINGFA SDN BHD' },
        { patterns: ['mi selection'], code: '300-M047', name: 'MI SELECTION SDN BHD' },
        { patterns: ['big e & w', 'big e and w'], code: '300-B003', name: 'BIG E & W SDN BHD' },
        { patterns: ['gst fine foods', 'gst'], code: '300-G005', name: 'GST FINE FOODS SDN BHD' },
        { patterns: ['vino musica'], code: '300-V007', name: 'VINO MUSICA SDN BHD' },
        { patterns: ['tag seafood', 'tag'], code: '300-S033', name: 'TAG SEAFOOD' },
        { patterns: ['absolute luxury', 'absolute'], code: '300-A005', name: 'ABSOLUTE LUXURY RESTAURANT S/B' },
        { patterns: ['inhome dining', 'inhome'], code: '300-I004', name: 'INHOME DINING SDN BHD' },
        { patterns: ['empire cuisine', 'empire'], code: '300-E007', name: 'EMPIRE CUISINE SDN BHD 御膳楼大酒家' },
        { patterns: ['sgk f&b', 'sgk'], code: '300-S035', name: 'SGK F&B (TRX) SDN BHD' },
        { patterns: ['soon lee', 'soon lee seafood'], code: '300-S034', name: 'SOON LEE SEAFOOD RESTAURANT SDN BHD' },
        { patterns: ['five thousand years', '5000 years'], code: '300-F013', name: 'FIVE THOUSAND YEARS KL 五千年三国店' },
        { patterns: ['pang china'], code: '300-P023', name: 'PANG CHINA' },
        { patterns: ['668 seafood', '668'], code: '300-6002', name: '668 SEAFOOD RESTAURANT (MAHKOTA CHERAS)' },
    ];

    // Try to find a match
    for (const mapping of customerMappings) {
        for (const pattern of mapping.patterns) {
            if (lowerName.includes(pattern)) {
                return {
                    customerCode: mapping.code,
                    customerName: mapping.name,
                    groupName: groupName
                };
            }
        }
    }

    return null; // No match found
}

// Add customer context to AI prompt
function addCustomerContextToPrompt(baseContext, customerContext) {
    if (!customerContext) return baseContext;

    const contextAddition = `\n\n**IMPORTANT GROUP CONTEXT:**\n` +
        `This conversation is in a group chat for customer: ${customerContext.customerName} (Code: ${customerContext.customerCode})\n` +
        `When the user asks about "they", "them", "this customer", or uses general terms without specifying a customer name, ` +
        `assume they are referring to ${customerContext.customerName}.\n` +
        `Filter invoice data and queries to show information specific to this customer unless explicitly asked otherwise.\n`;

    return baseContext + contextAddition;
}

module.exports = {
    getCustomerContextFromGroup,
    addCustomerContextToPrompt
};
