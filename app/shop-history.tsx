import { supabase } from '@/services/supabase'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

const ShopHistory = () => {
    const [history, setHistory] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                const { data, error } = await supabase.rpc(
                    'get_shop_purchase_transactions',
                    {
                        p_page:
                            1
                        ,
                        p_page_size:
                            10
                        ,
                    }
                );
                if (error) {
                    console.log("error in fetch data shop history", error)
                    return
                }
                if (data) {
                    console.log("data from fetch data shop history", data)
                    setHistory(data)
                }
            } catch (error) {
                console.log(error)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [])

    return (
        <View>
            <Text>shop-history</Text>
        </View>
    )
}

export default ShopHistory