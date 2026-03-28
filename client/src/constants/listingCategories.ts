export const LISTING_CATEGORY_OPTIONS = [
    { label: 'Furniture', value: 'furniture' },
    { label: 'School Supplies', value: 'school supplies' },
    { label: 'Clothes', value: 'clothes' },
    { label: 'Electronics', value: 'electronics' },
    { label: 'Kitchen', value: 'kitchen' },
    { label: 'Other', value: 'other' }
] as const;

export const LISTING_SUBCATEGORY_OPTIONS: Record<string, { label: string; value: string }[]> = {
    furniture: [
        { label: 'Chair', value: 'chair' },
        { label: 'Desk', value: 'desk' },
        { label: 'Table', value: 'table' },
        { label: 'Sofa / Couch', value: 'sofa' },
        { label: 'Bed Frame', value: 'bed frame' },
        { label: 'Dresser', value: 'dresser' },
        { label: 'Shelf / Bookcase', value: 'shelf' },
        { label: 'Lamp', value: 'lamp' },
        { label: 'Other Furniture', value: 'other furniture' }
    ],
    'school supplies': [
        { label: 'Textbook', value: 'textbook' },
        { label: 'Notebook / Binder', value: 'notebook' },
        { label: 'Backpack', value: 'backpack' },
        { label: 'Calculator', value: 'calculator' },
        { label: 'Art Supplies', value: 'art supplies' },
        { label: 'Lab Equipment', value: 'lab equipment' },
        { label: 'Other School Supplies', value: 'other school supplies' }
    ],
    clothes: [
        { label: 'Tops', value: 'tops' },
        { label: 'Bottoms', value: 'bottoms' },
        { label: 'Shoes', value: 'shoes' },
        { label: 'Outerwear', value: 'outerwear' },
        { label: 'Accessories', value: 'accessories' },
        { label: 'Activewear', value: 'activewear' },
        { label: 'Other Clothes', value: 'other clothes' }
    ],
    electronics: [
        { label: 'Laptop', value: 'laptop' },
        { label: 'Phone', value: 'phone' },
        { label: 'Tablet', value: 'tablet' },
        { label: 'Headphones', value: 'headphones' },
        { label: 'Charger / Cable', value: 'charger' },
        { label: 'Monitor', value: 'monitor' },
        { label: 'Keyboard / Mouse', value: 'keyboard' },
        { label: 'Camera', value: 'camera' },
        { label: 'Other Electronics', value: 'other electronics' }
    ],
    kitchen: [
        { label: 'Cookware', value: 'cookware' },
        { label: 'Utensils', value: 'utensils' },
        { label: 'Small Appliances', value: 'small appliances' },
        { label: 'Dishes / Cups', value: 'dishes' },
        { label: 'Food Storage', value: 'food storage' },
        { label: 'Other Kitchen', value: 'other kitchen' }
    ]
};
